<script lang="ts">
	import {
		filterElFromArr,
		getDataGivenStepsOfFields,
		getDeepField,
		getPreciseType,
		getQMSWraperCtxDataGivenControlPanelItem,
		hasDeepProperty,
		passAllObjectValuesThroughStringTransformerAndReturnNewObject
	} from '../utils/usefulFunctions';
	import { getContext, setContext, untrack } from 'svelte';
	import Modal from './Modal.svelte';
	import { nodeAddDefaultFields } from '$lib/utils/usefulFunctions';
	import SelectItem from './SelectItem.svelte';
	import SelectQMS from './SelectQMS.svelte';
	import { createQMSSearchInstance, discoverMatchingQMS } from '$lib/utils/searchUtils';
	import {
		getRowSelectionState,
		processSelectedRowsColValues,
		getRequiredColumnNames
	} from '$lib/utils/rowSelectionUtils';
	import {
		stepsOfNodesToStepsOfFields,
		getUpdatedStepsOfNodes,
		updateNodeSteps
	} from '../utils/nodeStepsUtils';
	import type {
		ContainerData,
		ActiveArgumentData,
		QMSWraperContext,
		QMSMainWraperContext
	} from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		nodes: Record<string, ContainerData | ActiveArgumentData>;
		parentNodeId: string;
		parentNode?: ContainerData;
		node: ContainerData | ActiveArgumentData;
		availableOperators: any;
		group: any;
		type: any;
		originalNodes: any;
		prefix?: string;
		addDefaultFields?: boolean;
		showSelectModal?: boolean;
		onChanged?: (detail?: any) => void;
		onUpdateQuery?: () => void;
		onChildrenStartDrag?: (e?: any) => void;
		onDeleteSubNode?: (detail: { id: string }) => void;
		bindSelectedQMS?: any;
		bindSelectedRowsColValues?: any;
	}

	let {
		nodes = $bindable(),
		parentNodeId,
		parentNode = nodes[parentNodeId] as ContainerData,
		node = $bindable(),
		availableOperators,
		group,
		type,
		originalNodes,
		prefix = '',
		addDefaultFields,
		showSelectModal = $bindable(false),
		onChanged,
		bindSelectedQMS = $bindable(),
		bindSelectedRowsColValues = $bindable()
	}: Props = $props();

	let stepsOfNodes = $state<unknown[]>([]);

	const OutermostQMSWraperContext = getContext(
		`${prefix}OutermostQMSWraperContext`
	) as QMSWraperContext;
	let pathIsInCP = false;
	const nodeContext = getContext(`${prefix}nodeContext`) as { pathIsInCP: boolean } | undefined;
	if (nodeContext) {
		pathIsInCP = nodeContext?.pathIsInCP;
	}
	const CPItemContext = getContext(`${prefix}CPItemContext`) as
		| { CPItem: { nodeId: string } }
		| undefined;
	let nodeIsInCP = $derived(CPItemContext?.CPItem.nodeId == node.id);

	if (CPItemContext?.CPItem.nodeId == node.id) {
		setContext(`${prefix}nodeContext`, { pathIsInCP: true });
	}
	const isCPChild = !!CPItemContext;

	let correctQMSWraperContext: any = '';
	if (isCPChild) {
		correctQMSWraperContext = getQMSWraperCtxDataGivenControlPanelItem(
			CPItemContext!.CPItem as any,
			OutermostQMSWraperContext as any
		);
	} else {
		correctQMSWraperContext = getContext(`${prefix}QMSWraperContext`);
	}

	const { finalGqlArgObj_Store, QMS_info, activeArgumentsDataGrouped_Store, QMSType } =
		correctQMSWraperContext;

	const operatorChangeHandler = () => {
		stepsOfNodes = getUpdatedStepsOfNodes(
			JSON.parse(JSON.stringify(parentNode?.stepsOfNodes || [])),
			node
		);
	};
	const dndIsOn = getContext('dndIsOn');
	const mutationVersion = getContext('mutationVersion');
	if (QMSType == 'mutation') {
		// $mutationVersion = true; // Cannot assign to store directly if not using $ store syntax from import, handled by parent context usually
	}

	let stepsOfFieldsFull = $derived(stepsOfNodesToStepsOfFields(stepsOfNodes as any[]));
	let stepsOfFields = $derived(filterElFromArr(stepsOfFieldsFull, ['list', 'bonded']));

	$effect(() => {
		const isRoot = parentNodeId === node.id;
		const parentSteps = isRoot ? [] : (parentNode?.stepsOfNodes ?? []);
		stepsOfNodes = getUpdatedStepsOfNodes(JSON.parse(JSON.stringify(parentSteps)), node);
	});

	let MainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const endpointInfo = MainWraperContext?.endpointInfo;
	const schemaData = MainWraperContext?.schemaData;
	let dragDisabled = true;
	const flipDurationMs = 500;

	function handleDndConsider(e: any) {
		(node as ContainerData).items = e.detail.items;
		dragDisabled = true;
	}
	function handleDndFinalize(e: any) {
		(node as ContainerData).items = e.detail.items;
		nodes = { ...nodes };
		handleChanged();
		onChanged?.();
		dragDisabled = true;
	}

	const deleteItem = (e: any) => {
		(node as ContainerData).items = (node as ContainerData).items.filter((item) => {
			return item.id !== e.detail.id;
		});
		// nodes[e.detail.id] = undefined;
		//!!! to do: also delete the node from "nodes"
		nodes = { ...nodes };
		handleChanged();
		onChanged?.();
	};
	//
	let labelEl = $state<HTMLElement>();
	let shadowEl = $state<HTMLElement>();
	let shadowHeight = $state(20);
	let shadowWidth = $state(20);

	let labelElClone: any = $state();

	function startDrag(e: any) {
		// preventing default to prevent lag on touch devices (because of the browser checking for screen scrolling)
		//e.preventDefault();
		dragDisabled = false;
	}
	function handleKeyDown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && dragDisabled) dragDisabled = false;
	}
	const transformDraggedElement = (draggedEl: HTMLElement, data: any, index: number) => {
		draggedEl?.classList.add('bg-accent/25', 'border-2', 'border-accent');
		draggedEl
			.querySelector('.dnd-item')
			?.classList.add('bg-accent/25', 'border-2', 'border-accent');
	};
	//
	const dragDisabledConstantTest = true;

	const handleChanged = () => {
		finalGqlArgObj_Store.regenerate_groupsAndfinalGqlArgObj();
	};

	let argsInfo = QMS_info?.args;
	let showModal = false;

	const groupDisplayTitle = $derived.by(() => {
		let title = '';
		if (node.dd_displayName) {
			title = `${title}${node.dd_displayName}`;
		}

		if ((node as ContainerData)?.operator != 'bonded') {
			if (title.trim() != '') {
				title = `${title} `;
			}

			if ((node as ContainerData)?.operator == 'list') {
				title = `${title} (list)`;
			}
			if (['_and', '_or'].includes((node as ContainerData)?.operator)) {
				title = `${title}${(node as ContainerData)?.operator} (list)`;
			}
		}
		if (title.trim() == '' || getPreciseType(title) == 'undefined') {
			if ((node as ContainerData)?.operator == 'bonded') {
				title = '(item)';
			} else if ((node as ContainerData)?.operator == '~spread~') {
				title = '(~spread~)';
			}
		}
		return title;
	});

	$effect(() => {
		if ((node as any)?.addDefaultFields || ((node as ContainerData)?.isMain && addDefaultFields)) {
			untrack(() =>
				nodeAddDefaultFields(
					node as ContainerData,
					prefix,
					group,
					activeArgumentsDataGrouped_Store,
					schemaData,
					endpointInfo
				)
			);
		}
	});

	let showAddModal = false;
	let selectedRowsModel = $state({});

	let showExplorerTable = true;
	const fuse = createQMSSearchInstance($schemaData.queryFields);
	const nodeContext_forDynamicData = getContext(`${prefix}nodeContext_forDynamicData`) as any;
	let selectedQMS = nodeContext_forDynamicData.selectedQMS;
	let QMSRows = nodeContext_forDynamicData.QMSRows;
	let rowSelectionState = nodeContext_forDynamicData.rowSelectionState;
	let selectedRowsColValues = nodeContext_forDynamicData.selectedRowsColValues;
	let selectedRowsColValuesProcessed = nodeContext_forDynamicData.selectedRowsColValuesProcessed;
	let idColName = nodeContext_forDynamicData.idColName;
	let requiredColNames = nodeContext_forDynamicData.requiredColNames;

	$effect(() => {
		if (bindSelectedQMS !== undefined) {
			$selectedQMS = bindSelectedQMS;
		}
	});
	$effect(() => {
		if (bindSelectedRowsColValues !== undefined) {
			$selectedRowsColValues = bindSelectedRowsColValues;
		}
	});
	$effect(() => {
		bindSelectedQMS = $selectedQMS;
		bindSelectedRowsColValues = $selectedRowsColValues;
	});

	if ((node as any)?.selectedQMS) {
		$selectedQMS = (node as any).selectedQMS;
		$activeArgumentsDataGrouped_Store = $activeArgumentsDataGrouped_Store;
	}
	//------------
	let inputColumnsLocationQMS_Info: any;
	//!! todo:before getting inputColumnsLocation value,you should check if it is a query or a mutation,and handle it accordingly
	let inputColumnsLocation = $endpointInfo?.inputColumnsPossibleLocationsInArg?.find(
		(path: string[]) => {
			inputColumnsLocationQMS_Info = getDeepField(node as any, path, schemaData, 'inputFields');
			return inputColumnsLocationQMS_Info;
		}
	);
	//should work
	//------------

	let QMSWraperContextForSelectedQMS = $state({});
	let activeArgumentsContext = getContext(`${prefix}activeArgumentsContext`);
	let forceShowSelectAndAddButtons = false;
	const inputFieldsContainerLocation = endpointInfo.get_inputFieldsContainerLocation(
		node as any,
		schemaData
	);
	const inputFieldsContainer = getDeepField(
		node as any,
		inputFieldsContainerLocation,
		schemaData,
		'inputFields'
	);
	const { QMSFieldToQMSGetMany_Store } = OutermostQMSWraperContext;
	let getManyQMS = $state();
	let showSelectQMSModal = $state(false);

	$effect(() => {
		if (showSelectModal) {
			$QMSRows = discoverMatchingQMS(node, group, schemaData, fuse);

			// Auto-select if only one match
			if ($QMSRows.length == 1) {
				$selectedQMS = $QMSRows[0];
			}
		}
	});

	$effect(() => {
		const full = stepsOfFieldsFull;
		const short = stepsOfFields;
		const snapshot = $state.snapshot(stepsOfNodes);
		untrack(() => {
			updateNodeSteps(node, full, short, snapshot as any, filterElFromArr);
		});
	});
	$effect(() => {
		if (labelEl) {
			shadowHeight = labelEl.clientHeight;
			shadowWidth = labelEl.clientWidth;
		}
	});
	$effect(() => {
		if (shadowHeight && shadowEl) {
			if (shadowEl.style.height == '0px' || shadowEl.style.height == '') {
				//if (shadowEl.style.height == 0) ensures the bellow runs only once per grab of element to move
				shadowEl.style.height = `${shadowHeight + 18}px`;
				shadowEl.style.width = `${shadowWidth}px`;

				//put labelElClone in place of shadowEl
				// if (labelElClone) {
				// 	shadowEl.removeChild(labelElClone);
				// }
				if (labelEl) {
					labelElClone = labelEl.cloneNode(true);
					labelElClone.classList.remove('dnd-item');
					labelElClone.classList.add('border-2', 'border-accent');
					shadowEl.appendChild(labelElClone);
				}
			}
		}
	});
	$effect(() => {
		if (QMSWraperContextForSelectedQMS) {
			$idColName = (QMSWraperContextForSelectedQMS as any).idColName;
		}
	});
	$effect(() => {
		if ($QMSFieldToQMSGetMany_Store.length > 0) {
			getManyQMS = QMSFieldToQMSGetMany_Store.getObj({
				nodeOrField: node
			})?.getMany?.selectedQMS;
			if (getManyQMS) {
			}
		}
	});
</script>

<Modal
	bind:show={showSelectModal}
	showApplyBtn={true}
	modalIdentifier="activeArgumentsDataModal"
	onApply={() => {
			$rowSelectionState = getRowSelectionState(selectedRowsModel);
			$requiredColNames = getRequiredColumnNames(node);

			$selectedRowsColValuesProcessed = processSelectedRowsColValues(
				$selectedRowsColValues,
				$idColName,
				$requiredColNames,
				node,
				endpointInfo,
				passAllObjectValuesThroughStringTransformerAndReturnNewObject
			);

			node.selectedRowsColValues = $selectedRowsColValuesProcessed;
			handleChanged();
			showSelectModal = false;
		}}
		onCancel={() => {
			showSelectModal = false;
		}}
	>
		<div class="flex flex-col">
			<div class="mb-2 w-full text-center text-lg">
				<Badge variant="secondary" class="font-bold">
					{groupDisplayTitle}
				</Badge>

				<SelectQMS bind:showSelectQMSModal {node} />

				<SelectItem
					{node}
					bind:QMSWraperContext={QMSWraperContextForSelectedQMS}
					rowSelectionState={$rowSelectionState}
					enableMultiRowSelectionState={inputFieldsContainer?.dd_kindList}
					onRowSelectionChange={(detail: any) => {
						selectedRowsModel = detail;
						let selectedRowsOriginal = detail.rows.map((row: any) => row.original);

						const returningColumnsLocation =
							$endpointInfo?.returningColumnsPossibleLocationsInQueriesPerRow?.find((item: any) => {
								return hasDeepProperty(selectedRowsOriginal[0], item);
							});
						//string_transformer

						$selectedRowsColValues = selectedRowsOriginal.map((row: any) => {
							return getDataGivenStepsOfFields(undefined, row, returningColumnsLocation);

							//return getDataGivenStepsOfFields(undefined, row, returningColumnsLocation);
						});
						//!!every element of 'selectedRowsColValues' must be cheched like so: every element must have all values checked ,if string pass trough string transformer
					}}
					onRowClicked={(e) => {}}
					bind:QMS_info={$selectedQMS}
				/>

				<Button
					variant="secondary"
					size="sm"
					class="w-full"
					onclick={() => {
						showSelectQMSModal = true;
					}}
				>
					Select Query Source
				</Button>
			</div>
	</div>
</Modal>
