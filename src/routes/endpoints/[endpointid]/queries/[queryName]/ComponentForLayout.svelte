<script lang="ts">
	import AddColumn from '$lib/components/AddColumn.svelte';
	import Table from '$lib/components/Table.svelte';
	import { page } from '$app/stores';
	import {
		generateTitleFromStepsOfFields,
		getDataGivenStepsOfFields,
		getFields_Grouped,
		getRootType,
		stepsOfFieldsToQueryFragmentObject
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
	import GraphqlCodeDisplay from '$lib/components/GraphqlCodeDisplay.svelte';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { historyQueries } from '$lib/stores/historyQueriesStore';
	import HeadersEditor from '$lib/components/HeadersEditor.svelte';
	import EnvVarsManager from '$lib/components/EnvVarsManager.svelte';
	import { logger } from '$lib/utils/logger';
	import { get } from 'svelte/store';
	import type { QMSMainWraperContext } from '$lib/types/index';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Alert from '$lib/components/ui/alert';
	import { AlertCircle, RefreshCw, PlusCircle, LayoutGrid, FileJson, Code, Settings2, Variable, X } from 'lucide-svelte';

	// Props interface and destructuring MUST come before getContext calls that use prefix
	interface Props {
		prefix?: string;
		enableMultiRowSelectionState?: boolean;
		currentQMS_info?: any;
		rowSelectionState?: any;
		onRowSelectionChange?: (detail: any) => void;
		onRowClicked?: (detail: any) => void;
		children?: import('svelte').Snippet;
	}

	let {
		prefix = '',
		enableMultiRowSelectionState = true,
		currentQMS_info,
		rowSelectionState = {},
		onRowSelectionChange,
		onRowClicked,
		children
	}: Props = $props();

	// Now we can safely use prefix in getContext calls
	let qmsMainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const endpointInfo = qmsMainWraperContext?.endpointInfo;
	const schemaData = qmsMainWraperContext?.schemaData;
	const urqlCoreClient = qmsMainWraperContext?.urqlCoreClient;

	const qmsWraperContext = getContext(`${prefix}QMSWraperContext`) as any;
	const {
		QMS_bodyPart_StoreDerived_rowsCount,
		activeArgumentsDataGrouped_Store,
		tableColsData_Store,
		finalGqlArgObj_Store,
		QMS_bodyPartsUnifier_StoreDerived,
		paginationOptions,
		paginationState,
		QMSName
	} = qmsWraperContext;

	// Handle currentQMS_info default value - now that schemaData is available
	if (!currentQMS_info) {
		currentQMS_info = schemaData.get_QMS_Field(QMSName, 'query', schemaData);
	}

	let unsubscribeQMSBody: () => void;

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
		if (unsubscribeQMSBody) unsubscribeQMSBody();
	});

	let dd_relatedRoot = getRootType(null, currentQMS_info.dd_rootName, schemaData);
	if (!currentQMS_info) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto('/queries');
	}

	const paginationTypeInfo = get_paginationTypes(endpointInfo, schemaData).find((pagType: any) => {
		return pagType.name == currentQMS_info.dd_paginationType;
	});

	let scalarFields: any[] = [];
	if (dd_relatedRoot) {
		({ scalarFields } = getFields_Grouped(dd_relatedRoot, [], schemaData));
	}

	let queryData: { fetching: boolean; error: any; data: any } = $state({
		fetching: false,
		error: null,
		data: null
	});
	let rows: any[] = $state([]);
	let rowsCurrent: any[] = [];
	let loadedF: (() => void) | undefined;
	let completeF: (() => void) | undefined;
	let infiniteId = $state(Math.random());
	function infiniteHandler({
		detail: { loaded, complete }
	}: {
		detail: { loaded: () => void; complete: () => void };
	}) {
		logger.debug('infiniteHandler triggered', { loaded, complete });
		loadedF = loaded;
		completeF = complete;
		const rowLimitingArgNames = paginationTypeInfo?.get_rowLimitingArgNames?.(
			currentQMS_info.dd_paginationArgs
		);
		if (
			rowLimitingArgNames?.some((argName: any) => {
				if (!argName) return false;
				const pageSize = $paginationState?.[argName] as number;
				return pageSize && rows.length / pageSize >= 1; //means that all previous pages contained nr of items == page items size
			}) ||
			paginationTypeInfo?.name == 'pageBased'
		) {
			paginationState.nextPage(queryData?.data, QMSName, 'query');
		} else {
			loaded();
			complete();
		}
	}
	const runQuery = (queryBody: string) => {
		logger.debug('runQuery called', queryBody);
		let fetching = true;
		let error: any = false;
		let data: any = false;

		const startTime = Date.now();
		logger.debug('Query Execution Start: ' + new Date(startTime).toISOString());
		const endpointId = $page.params.endpointid;
		const queryName = QMSName;

		$urqlCoreClient
			.query(queryBody, {})
			.toPromise()
			.then((result: any) => {
				fetching = false;
				const duration = Date.now() - startTime;
				logger.debug('Query Execution Completed in ' + duration + ' ms');
				let status: 'success' | 'error' = 'success';

				if (result.error) {
					logger.debug('Query Error:', result.error);
					error = result.error.message;
					status = 'error';
				}
				if (result.data) {
					logger.debug('Query Data Size: ' + JSON.stringify(result.data).length + ' bytes');
					data = result.data;
				}

				// Capture history
				try {
					const finalGqlArgObj = get(finalGqlArgObj_Store) as any;
					const tableColsData = get(tableColsData_Store) as any;

					// Simple deep copy to avoid mutations affecting stored history if objects are referenced
					const argsToSave = finalGqlArgObj?.finalGqlArgObj
						? JSON.parse(JSON.stringify(finalGqlArgObj.finalGqlArgObj))
						: {};
					const colsToSave = tableColsData ? JSON.parse(JSON.stringify(tableColsData)) : [];

					if (endpointId) {
						historyQueries.add({
							endpointId,
							queryName,
							type: 'query',
							args: argsToSave,
							cols: colsToSave,
							timestamp: Date.now(),
							duration,
							status,
							queryBody
						});
					}
				} catch (e) {
					logger.error('Failed to save query history:', e);
				}

				queryData = { fetching, error, data };
				let stepsOfFieldsInput = [
					currentQMS_info.dd_displayName,
					...endpointInfo.get_rowsLocation(currentQMS_info, schemaData)
				];
				rowsCurrent = getDataGivenStepsOfFields(
					undefined,
					queryData.data,
					stepsOfFieldsInput
				) as any[];
				if (rowsCurrent && !Array.isArray(rowsCurrent)) {
					rowsCurrent = [rowsCurrent];
				}
				if ($paginationOptions.infiniteScroll) {
					if (
						paginationTypeInfo?.isFirstPage?.(paginationState, currentQMS_info.dd_paginationArgs) &&
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
								currentQMS_info.dd_paginationArgs
							) &&
							rowsCurrent?.length == 0
						) {
							rows = rowsCurrent;
						}
					}
				} else {
					rows = rowsCurrent;
				}
				const rowLimitingNames = paginationTypeInfo?.get_rowLimitingArgNames?.(
					currentQMS_info.dd_paginationArgs
				);
				if (
					(rowLimitingNames &&
						rowLimitingNames.length > 0 &&
						rowLimitingNames.some((argName: any) => {
							if (!argName) return false;
							return rowsCurrent?.length == ($paginationState?.[argName] as number);
						})) ||
					paginationTypeInfo?.name == 'pageBased'
				) {
					if (loadedF) loadedF();
				} else {
					if (completeF) completeF();
				}

				rowsCurrent = [];
			});
	};
	unsubscribeQMSBody = QMS_bodyPartsUnifier_StoreDerived.subscribe((QMS_body: string) => {
		if (QMS_body && QMS_body !== '') {
			runQuery(QMS_body);
		}
	});

	if (scalarFields.length == 0) {
		queryData = { fetching: false, error: false, data: false };
	} else {
		queryData = { fetching: true, error: false, data: false };
	}

	const hideColumn = (detail: { column: string }) => {
		tableColsData_Store.removeColumn(detail.column);
	};

	let column_stepsOfFields = $state('');
	const addColumnFromInput = (e: any) => {
		if (e.key == 'Enter') {
			let stepsOfFields = column_stepsOfFields.replace(/\s/g, '').replace(/\./g, '>').split('>');
			let tableColData = {
				title: `col-${Math.floor(Math.random() * 200)},${generateTitleFromStepsOfFields(
					stepsOfFields
				)}`,
				stepsOfFields: [QMSName, ...stepsOfFields],
				stepsOfFieldsOBJ: stepsOfFieldsToQueryFragmentObject([QMSName, ...stepsOfFields], false)
			};

			tableColsData_Store.addColumn(tableColData);
			column_stepsOfFields = '';
		}
	};

	//Active arguments logic
	let showQMSBody = $state(false);
	let showNonPrettifiedQMSBody = false;

	// Auto-Refresh Logic
	let autoRefresh = $state(false);
	let refreshInterval = $state(5000);
	let intervalId: ReturnType<typeof setInterval> | undefined = undefined;

	const toggleAutoRefresh = () => {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			logger.info('Starting auto-refresh', { interval: refreshInterval });
			runQuery(get(QMS_bodyPartsUnifier_StoreDerived));
			intervalId = setInterval(() => {
				logger.debug('Auto-refresh triggered');
				runQuery(get(QMS_bodyPartsUnifier_StoreDerived));
			}, refreshInterval);
		} else {
			logger.info('Stopping auto-refresh');
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
		}
	};

	$effect(() => {
		if (autoRefresh && intervalId) {
			clearInterval(intervalId);
			intervalId = setInterval(() => {
				logger.debug('Auto-refresh triggered (interval updated)');
				runQuery(get(QMS_bodyPartsUnifier_StoreDerived));
			}, refreshInterval);
		}
	});

	onMount(() => {
		hljs.registerLanguage('graphql', graphql);
		hljs.highlightAll();
	});
	let showModal = $state(false);
	let showHeadersModal = $state(false);
	let showVarsModal = $state(false);
	let viewMode = $state<'table' | 'json'>('table');
</script>

<div class="p-2">
	<ControlPanel
		type={currentQMS_info}
		bind:column_stepsOfFields
		{addColumnFromInput}
		{dd_relatedRoot}
		{QMSName}
		{currentQMS_info}
	/>
</div>

<div class="mx-2 flex flex-wrap gap-2 items-center">
	<div class="w-[300px]">
		<AddColumn
			bind:column_stepsOfFields
			{addColumnFromInput}
			{dd_relatedRoot}
			{QMSName}
			QMS_info={currentQMS_info}
			onNewColumnAddRequest={(tableColData: any) => {
				tableColsData_Store.addColumn(tableColData);
			}}
		/>
	</div>

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
		<div class="w-full p-4">
			<h3 class="mb-4 text-lg font-bold">Query Arguments</h3>
			<ActiveArguments />
		</div>
	</Modal>

	<div class="flex items-center rounded-md border bg-muted/50 p-1">
		<Button
			variant={viewMode === 'table' ? 'secondary' : 'ghost'}
			size="sm"
			class="h-7 px-3"
			onclick={() => (viewMode = 'table')}
		>
			<LayoutGrid class="mr-2 h-4 w-4" /> Table
		</Button>
		<Button
			variant={viewMode === 'json' ? 'secondary' : 'ghost'}
			size="sm"
			class="h-7 px-3"
			onclick={() => (viewMode = 'json')}
		>
			<FileJson class="mr-2 h-4 w-4" /> JSON
		</Button>
	</div>

	<div class="flex gap-1">
		<Button variant="outline" size="sm" onclick={() => (showQMSBody = !showQMSBody)}>
			<Code class="mr-2 h-4 w-4" /> GQL Body
		</Button>
		<Button variant="outline" size="sm" onclick={() => (showHeadersModal = true)}>
			<Settings2 class="mr-2 h-4 w-4" /> Headers
		</Button>
		<Button variant="outline" size="sm" onclick={() => (showVarsModal = true)}>
			<Variable class="mr-2 h-4 w-4" /> Variables
		</Button>
	</div>

	<!-- Auto-Refresh UI -->
	<div class="flex items-center gap-1 rounded-md border bg-muted/50 p-1">
		<Button
			variant={autoRefresh ? 'default' : 'ghost'}
			size="sm"
			class="h-7 w-7 p-0"
			onclick={toggleAutoRefresh}
			aria-label="Toggle Auto-Refresh"
		>
			<RefreshCw class="h-4 w-4 {autoRefresh ? 'animate-spin' : ''}" />
		</Button>
		{#if autoRefresh}
			<Input
				type="number"
				class="h-7 w-20 border-0 bg-transparent text-xs focus-visible:ring-0"
				bind:value={refreshInterval}
				min="1000"
				step="1000"
				aria-label="Refresh Interval (ms)"
			/>
		{/if}
	</div>

	<Modal bind:show={showHeadersModal} modalIdentifier="headersModal" showApplyBtn={false}>
		<div class="p-4">
			<HeadersEditor {endpointInfo} onClose={() => (showHeadersModal = false)} />
		</div>
	</Modal>
	<Modal bind:show={showVarsModal} modalIdentifier="varsModal" showApplyBtn={false}>
		<div class="p-4">
			<EnvVarsManager onClose={() => (showVarsModal = false)} />
		</div>
	</Modal>

	{#if QMS_bodyPart_StoreDerived_rowsCount}
		<Badge variant="outline" class="flex gap-2 bg-primary/10 text-primary border-primary/20">
			{rows.length} /
			<RowCount
				QMS_bodyPart_StoreDerived={QMS_bodyPart_StoreDerived_rowsCount}
				QMS_info={currentQMS_info}
			/>
		</Badge>
	{/if}

	<Button size="sm" class="h-8 w-8 p-0" aria-label="Add">
		<PlusCircle class="h-5 w-5" />
	</Button>
</div>

{@render children?.()}

{#if queryData.error}
	<div class="mx-2 mt-4">
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Query Error</Alert.Title>
			<Alert.Description class="max-h-32 overflow-auto">
				{queryData.error}
			</Alert.Description>
			<Button
				variant="ghost"
				size="sm"
				class="absolute right-2 top-2 h-6 w-6 p-0"
				onclick={() => { queryData.error = null; }}
			>
				<X class="h-4 w-4" />
			</Button>
		</Alert.Root>
	</div>
{/if}

{#if queryData.fetching}
	<div class="flex items-center justify-center p-12">
		<RefreshCw class="h-8 w-8 animate-spin text-muted-foreground" />
		<span class="ml-3 text-muted-foreground">Fetching data...</span>
	</div>
{/if}

{#if showQMSBody}
	<div class="mx-2 mt-4 overflow-hidden rounded-md border">
		<GraphqlCodeDisplay
			{showNonPrettifiedQMSBody}
			{prefix}
			value={$QMS_bodyPartsUnifier_StoreDerived}
		/>
	</div>
{/if}

<div class="mt-4 md:px-2">
	{#if viewMode === 'table'}
		<Table
			{rowSelectionState}
			{enableMultiRowSelectionState}
			{infiniteId}
			{infiniteHandler}
			colsData={$tableColsData_Store}
			{rows}
			onHideColumn={(detail: { column: string }) => {
				hideColumn(detail);
			}}
			{onRowSelectionChange}
			{onRowClicked}
		/>
	{:else if queryData.data}
		<div class="mt-2 rounded-md border overflow-hidden">
			<GraphqlCodeDisplay
				value={JSON.stringify(queryData.data, null, 2)}
				enableSyncToUI={false}
				language="json"
				readonly={true}
				queryName={QMSName}
			/>
		</div>
	{:else if !queryData.fetching}
		<div class="p-12 text-center text-muted-foreground border rounded-md mx-2">
			No data available. Run a query to see results.
		</div>
	{/if}
</div>
