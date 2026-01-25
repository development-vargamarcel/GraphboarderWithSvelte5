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
		activeArgumentsDataGrouped_Store,
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

	let queryData = $state<{ fetching: boolean; error: any; data: any }>({ fetching: false, error: null, data: null });
	let rows = $state<any[]>([]);
	let rowsCurrent: any[] = [];
	let loadedF: any;
	let completeF: any;
	let infiniteId = $state(Math.random());

	if (scalarFields.length > 0) {
		queryData.fetching = true;
	}

	function infiniteHandler({ detail: { loaded, complete } }: any) {
		loadedF = loaded;
		completeF = complete;
		if (!currentQMS_info || !paginationTypeInfo) return;

		const rowLimitingArgNames = paginationTypeInfo?.get_rowLimitingArgNames(
			currentQMS_info.dd_paginationArgs || []
		);
		if (
			rowLimitingArgNames?.some((argName: any) => {
				return rows.length / ($paginationState as any)?.[argName] >= 1; //means that all previous pages contained nr of items == page items size
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

		if (!urqlCoreClient || !currentQMS_info) return;

		urqlCoreClient
			.query(queryBody)
			.toPromise()
			.then((result: any) => {
				fetching = false;

				if (result.error) {
					error = result.error.message;
				}
				if (result.data) {
					data = result.data;
				}
				queryData = { fetching, error, data };
				let stepsOfFieldsInput = [
					currentQMS_info!.dd_displayName,
					...endpointInfo.get_rowsLocation(currentQMS_info!, schemaData)
				];
				const rawData = getDataGivenStepsOfFields(undefined, queryData.data, stepsOfFieldsInput);
				rowsCurrent = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);

				if ($paginationOptions.infiniteScroll) {
					if (
						paginationTypeInfo?.isFirstPage?.(paginationState, currentQMS_info!.dd_paginationArgs || []) &&
						rowsCurrent?.length > 0
					) {
						infiniteId += 1;
						rows = [...rowsCurrent];
					} else {
						if (rowsCurrent?.[0] != undefined) {
							rows = [...rows, ...rowsCurrent];
						}
						if (
							paginationTypeInfo?.isFirstPage?.(paginationState, currentQMS_info!.dd_paginationArgs || []) &&
							rowsCurrent?.length == 0
						) {
							rows = rowsCurrent;
						}
					}
				} else {
					rows = rowsCurrent;
				}

				const limitingArgs = paginationTypeInfo?.get_rowLimitingArgNames?.(currentQMS_info!.dd_paginationArgs || []) || [];

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

				rowsCurrent = [];
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

	//Active arguments logic
	let showQMSBody = $state(false);
	let showNonPrettifiedQMSBody = false;

	onMount(() => {
		hljs.registerLanguage('graphql', graphql);
		hljs.highlightAll();
	});
	let showModal = $state(false);
</script>

{@render children?.()}

<!-- main -->
<div class="z-50 mx-2 flex space-x-2">
	<AddColumn
		bind:column_stepsOfFields
		{dd_relatedRoot}
		QMSName={queryName}
		QMS_info={currentQMS_info}
	/>
	<div class="grow==">
		{#if showModal}
			<Modal
				modalIdentifier={'activeArgumentsDataModal'}
				showApplyBtn={false}
				onCancel={(detail) => {
					if (detail.modalIdentifier == 'activeArgumentsDataModal') {
						showModal = false;
					}
				}}
				><div class="  w-full">
					<div class="mx-auto mt-2 w-full space-y-2 pb-2">
						<div class="w-2"></div>
						<ActiveArguments />
						<div class="w-2"></div>
					</div>
				</div>
			</Modal>
		{/if}
	</div>
	<button
		class=" btn grow normal-case btn-xs"
		onclick={() => {
			showQMSBody = !showQMSBody;
		}}>QMS body</button
	>
	{#if QMS_bodyPart_StoreDerived_rowsCount && currentQMS_info}
		<div class="badge flex space-x-2 badge-primary">
			{rows.length}/
			<RowCount
				QMS_bodyPart_StoreDerived={QMS_bodyPart_StoreDerived_rowsCount}
				QMS_info={currentQMS_info}
			/>
		</div>
	{/if}

	<button class="btn btn-xs btn-primary">
		<i class="bi bi-plus-circle-fill"></i>
	</button>
</div>

{@render children?.()}
{#if queryData.error}
	<div class="mx-auto mb-2 px-4">
		<div class="alert alert-error shadow-lg">
			<div>
				<button class="btn p-0 btn-ghost btn-sm">
					<svg
						onclick={() => {
							queryData.error = null;
						}}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Enter') queryData.error = null;
						}}
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 flex-shrink-0 cursor-pointer stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
				</button>

				<span class="max-h-20 overflow-auto">{queryData.error}</span>
			</div>
		</div>
	</div>
{/if}
{#if queryData.fetching}
	<p>Loading...</p>
{/if}
{#if showQMSBody}
	<GraphqlCodeDisplay {showNonPrettifiedQMSBody} value={$QMS_bodyPartsUnifier_StoreDerived} />
{/if}

<div class="md:px-2">
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
</div>
<div></div>
