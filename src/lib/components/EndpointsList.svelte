<script module>
	function formatBytes(bytes: number, decimals = 2) {
		if (!+bytes) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}
</script>

<script lang="ts">
	import AddColumn from './AddColumn.svelte';
	import { page } from '$app/stores';
	import Table from '$lib/components/Table.svelte';
	import {
		getDataGivenStepsOfFields,
		getFields_Grouped,
		getRootType
	} from '$lib/utils/usefulFunctions';
	import { onDestroy, onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import ActiveArguments from '$lib/components/ActiveArguments.svelte';
	import { get_paginationTypes } from '$lib/stores/pagination/paginationTypes';
	import hljs from 'highlight.js/lib/core';
	import graphql from 'highlight.js/lib/languages/graphql';
	import 'highlight.js/styles/base16/solarized-dark.css';
	import RowCount from '$lib/components/UI/rowCount.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { browser } from '$app/environment';
	import GraphqlCodeDisplay from './GraphqlCodeDisplay.svelte';
	import type { QMSWraperContext, QMSMainWraperContext } from '$lib/types';
	import HeadersEditor from '$lib/components/HeadersEditor.svelte';
	import EnvVarsManager from '$lib/components/EnvVarsManager.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { ListChecks, Braces, Code, Timer, HardDrive, PlusCircle, XCircle } from 'lucide-svelte';

	interface Props {
		prefix?: string;
		QMSName: any;
		children?: import('svelte').Snippet;
	}

	let { prefix = '', QMSName, children }: Props = $props();

	let MainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const endpointInfo = MainWraperContext?.endpointInfo;
	const urqlCoreClient = MainWraperContext?.urqlCoreClient;
	let queryName = QMSName;
	const WraperContext = getContext('QMSWraperContext') as QMSWraperContext;
	const {
		QMS_bodyPart_StoreDerived_rowsCount = null,
		tableColsData_Store,
		QMS_bodyPartsUnifier_StoreDerived,
		paginationOptions,
		paginationState
	} = WraperContext;
	const schemaData = MainWraperContext?.schemaData;

	onDestroy(() => {
		document.getElementById('my-drawer-3')?.click();
	});

	let currentQMS_info = schemaData.get_QMS_Field(queryName, 'query', schemaData);
	let dd_relatedRoot = getRootType(null, currentQMS_info?.dd_rootName, schemaData);
	if (!currentQMS_info) {
		goto('/queries');
	}

	const paginationTypeInfo = get_paginationTypes(endpointInfo, schemaData).find((pagType) => {
		return pagType.name == currentQMS_info?.dd_paginationType;
	});

	let { scalarFields } = getFields_Grouped(dd_relatedRoot || {}, [], schemaData);

	let queryData = $state<{ fetching: boolean; error: any; data: any }>({
		fetching: false,
		error: null,
		data: null
	});
	let rows = $state<any[]>([]);
	let loadedF: any;
	let completeF: any;
	let infiniteId = $state(Math.random());

	let executionTime = $state<number | null>(null);
	let responseSize = $state<number | null>(null);
	let viewMode = $state<'table' | 'json'>('table');

	$effect(() => {
		if (scalarFields.length > 0) {
			queryData.fetching = true;
		}
	});

	function infiniteHandler({ detail: { loaded, complete } }: any) {
		loadedF = loaded;
		completeF = complete;
		if (!currentQMS_info || !paginationTypeInfo) return;

		const rowLimitingArgNames = paginationTypeInfo?.get_rowLimitingArgNames?.(
			currentQMS_info.dd_paginationArgs || []
		);
		if (
			rowLimitingArgNames?.some((argName: any) => {
				return rows.length / ($paginationState as any)?.[argName] >= 1;
			}) ||
			paginationTypeInfo?.name == 'pageBased'
		) {
			paginationState.nextPage(queryData?.data, queryName, 'query');
		} else {
			loaded();
			complete();
		}
	}

	const runQuery = (queryBody: string) => {
		let fetching = true;
		let error: any = false;
		let data = false;

		const startTime = performance.now();

		if (!urqlCoreClient || !currentQMS_info) {
			return;
		}

		urqlCoreClient
			.query(queryBody, {})
			.toPromise()
			.then((result: any) => {
				const endTime = performance.now();
				executionTime = Math.round(endTime - startTime);

				fetching = false;

				if (result.error) {
					error = result.error.message;
				}
				if (result.data) {
					data = result.data;
					const jsonString = JSON.stringify(result.data);
					responseSize = new Blob([jsonString]).size;
				}
				queryData = { fetching, error, data };
				let stepsOfFieldsInput = [
					currentQMS_info!.dd_displayName,
					...endpointInfo.get_rowsLocation(currentQMS_info!, schemaData)
				];
				const rawData = getDataGivenStepsOfFields(undefined, queryData.data, stepsOfFieldsInput);
				let rowsCurrent = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];

				if ($paginationOptions.infiniteScroll) {
					if (
						paginationTypeInfo?.isFirstPage?.(
							paginationState,
							currentQMS_info!.dd_paginationArgs || []
						) &&
						rowsCurrent?.length > 0
					) {
						infiniteId += 1;
						rows = [...rowsCurrent];
					} else {
						if (rowsCurrent?.[0] != undefined) {
							rows = [...rows, ...rowsCurrent];
						}
						if (
							paginationTypeInfo?.isFirstPage?.(
								paginationState,
								currentQMS_info!.dd_paginationArgs || []
							) &&
							rowsCurrent?.length == 0
						) {
							rows = rowsCurrent;
						}
					}
				} else {
					rows = rowsCurrent;
				}

				const limitingArgs =
					paginationTypeInfo?.get_rowLimitingArgNames?.(currentQMS_info!.dd_paginationArgs || []) ||
					[];

				if (
					(limitingArgs.length > 0 &&
						limitingArgs.some((argName: any) => {
							return rowsCurrent?.length == ($paginationState as any)?.[argName];
						})) ||
					paginationTypeInfo?.name == 'pageBased'
				) {
					loadedF && loadedF();
				} else {
					completeF && completeF();
				}
			});
	};

	$effect(() => {
		const QMS_body = $QMS_bodyPartsUnifier_StoreDerived;
		if (QMS_body && QMS_body !== '') {
			runQuery(QMS_body);
		}
	});

	const hideColumn = (detail: any) => {
		tableColsData_Store.removeColumn(detail.column);
	};

	let column_stepsOfFields = $state('');
	let showQMSBody = $state(false);
	let showHeadersModal = $state(false);
	let showVarsModal = $state(false);

	onMount(() => {
		hljs.registerLanguage('graphql', graphql);
		hljs.highlightAll();
	});
	let showModal = $state(false);
</script>

{@render children?.()}

<div class="z-50 mx-2 flex flex-wrap items-center space-x-2 gap-y-2 py-2">
	<AddColumn
		bind:column_stepsOfFields
		{dd_relatedRoot}
		QMSName={queryName}
		QMS_info={currentQMS_info}
	/>
	<div class="grow">
		<Modal
			bind:show={showModal}
			modalIdentifier="activeArgumentsDataModal"
			showApplyBtn={false}
			onCancel={(detail: any) => {
				if (detail.modalIdentifier == 'activeArgumentsDataModal') {
					showModal = false;
				}
			}}
		>
			<div class="w-full space-y-4">
				<h2 class="text-xl font-bold tracking-tight">Active Arguments</h2>
				<ActiveArguments />
			</div>
		</Modal>
		<Modal bind:show={showHeadersModal} modalIdentifier="headers-modal" showApplyBtn={false}>
			<HeadersEditor {endpointInfo} onClose={() => (showHeadersModal = false)} />
		</Modal>
		<Modal bind:show={showVarsModal} modalIdentifier="vars-modal" showApplyBtn={false}>
			<EnvVarsManager onClose={() => (showVarsModal = false)} />
		</Modal>
	</div>

	<div class="inline-flex h-8 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
		<Button
			variant={viewMode === 'table' ? 'secondary' : 'ghost'}
			size="xs"
			class="h-6 rounded-md px-3 text-xs shadow-none"
			onclick={() => (viewMode = 'table')}>Table</Button
		>
		<Button
			variant={viewMode === 'json' ? 'secondary' : 'ghost'}
			size="xs"
			class="h-6 rounded-md px-3 text-xs shadow-none"
			onclick={() => (viewMode = 'json')}>JSON</Button
		>
	</div>

	<Button
		variant="outline"
		size="xs"
		onclick={() => (showHeadersModal = true)}
		title="Edit Request Headers"
	>
		<ListChecks class="mr-1 h-3 w-3" /> Headers
	</Button>
	<Button
		variant="outline"
		size="xs"
		onclick={() => (showVarsModal = true)}
		title="Manage Environment Variables"
	>
		<Braces class="mr-1 h-3 w-3" /> Variables
	</Button>

	<Button
		variant="outline"
		size="xs"
		class="grow"
		onclick={() => {
			showQMSBody = !showQMSBody;
		}}><Code class="mr-1 h-3 w-3" /> QMS body</Button
	>

	{#if executionTime !== null}
		<Badge variant="secondary" class="gap-1.5 py-1">
			<Timer class="h-3 w-3" />
			{executionTime}ms
		</Badge>
	{/if}
	{#if responseSize !== null}
		<Badge variant="secondary" class="gap-1.5 py-1">
			<HardDrive class="h-3 w-3" />
			{formatBytes(responseSize)}
		</Badge>
	{/if}

	{#if QMS_bodyPart_StoreDerived_rowsCount && currentQMS_info}
		<Badge variant="default" class="gap-1.5 py-1">
			{rows.length}/
			<RowCount
				QMS_bodyPart_StoreDerived={QMS_bodyPart_StoreDerived_rowsCount}
				QMS_info={currentQMS_info}
			/>
		</Badge>
	{/if}

	<Button variant="default" size="icon-xs" aria-label="Add" onclick={() => (showModal = true)}>
		<PlusCircle class="h-3 w-3" />
	</Button>
</div>

{@render children?.()}

{#if queryData.error}
	<div class="mx-auto mb-4 px-4">
		<Alert.Root variant="destructive" class="shadow-sm">
			<XCircle class="h-4 w-4" />
			<Alert.Description class="flex items-center justify-between gap-4">
				<span class="max-h-24 overflow-auto font-mono text-xs">{queryData.error}</span>
				<Button
					variant="ghost"
					size="icon-xs"
					onclick={() => {
						queryData.error = null;
					}}
				>
					<XCircle class="h-4 w-4" />
				</Button>
			</Alert.Description>
		</Alert.Root>
	</div>
{/if}

{#if queryData.fetching}
	<div class="flex items-center justify-center p-12 text-muted-foreground">
		<div class="flex items-center gap-2">
			<Timer class="h-5 w-5 animate-pulse" />
			<span class="animate-pulse font-medium">Fetching data...</span>
		</div>
	</div>
{/if}

{#if showQMSBody}
	<GraphqlCodeDisplay value={$QMS_bodyPartsUnifier_StoreDerived} />
{/if}

<div class="px-2">
	{#if viewMode === 'table'}
		<Table
			{infiniteId}
			{infiniteHandler}
			colsData={$tableColsData_Store}
			{rows}
			onHideColumn={hideColumn}
			onRowClicked={(detail) => {
				if (browser) {
					window.open(`${$page.url.origin}/endpoints/${detail.id}`, '_blank');
				}
			}}
		/>
	{:else if queryData.data}
		<div class="mt-2">
			<GraphqlCodeDisplay
				value={JSON.stringify(queryData.data, null, 2)}
				enableSyncToUI={false}
				language="json"
				readonly={true}
			/>
		</div>
	{/if}
</div>
