<script lang="ts">
	import Type from '$lib/components/Type.svelte';
	import Description from './Description.svelte';
	import { writable, type Writable } from 'svelte/store';
	import AutoInterface from '$lib/components/fields/AutoInterface.svelte';
	import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { getContext, setContext } from 'svelte';
	import type {
		ActiveArgumentData,
		ActiveArgumentGroup,
		ContainerData,
		QMSWraperContext,
		QMSMainWraperContext
	} from '$lib/types/index';
	import Toggle from '$lib/components/fields/Toggle.svelte';
	import { clickOutside } from '$lib/actions/clickOutside';
	import Modal from './Modal.svelte';
	import { string_transformerREVERSE } from '$lib/utils/dataStructureTransformers';
	import {
		argumentCanRunQuery,
		formatData,
		getPreciseType,
		getRootType
	} from '$lib/utils/usefulFunctions';
	import AddNodeToControlPanel from './AddNodeToControlPanel.svelte';
	import GroupDescriptionAndControls from './GroupDescriptionAndControls.svelte';
	import SelectModal from './SelectModal.svelte';
	import ExplorerTable from './ExplorerTable.svelte';
	import SelectedRowsDisplay from './SelectedRowsDisplay.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Trash2, Plus, Info, ChevronRight, Asterisk, MoreVertical } from 'lucide-svelte';

	interface Props {
		setNotInUseIfNotValid?: boolean;
		setNotInUseIfNotValidAndENUM?: boolean;
		parentNode?: ContainerData | ActiveArgumentData;
		node?: ActiveArgumentData | ContainerData;
		prefix?: string;
		isNot?: boolean;
		activeArgumentData: ActiveArgumentData;
		group: ActiveArgumentGroup;
		activeArgumentsDataGrouped?: ActiveArgumentGroup[];
		nodes?: (ActiveArgumentData | ContainerData)[];
		originalNodes?: (ActiveArgumentData | ContainerData)[];
		type?: string;
		parentNodeId?: string;
		availableOperators?: string[];
		startDrag?: (e: any) => void;
		onChanged?: (detail: any) => void;
		onInUseChanged?: () => void;
		onContextmenuUsed?: () => void;
		onUpdateQuery?: () => void;
		onDeleteSubNode?: (detail: { id: string }) => void;
		onChildrenStartDrag?: (e?: any) => void;
	}

	let {
		setNotInUseIfNotValid = true,
		setNotInUseIfNotValidAndENUM = true,
		parentNode = undefined,
		node = undefined,
		prefix = '',
		isNot = $bindable(false),
		activeArgumentData = $bindable(),
		group,
		activeArgumentsDataGrouped = [],
		nodes = $bindable([]),
		originalNodes = [],
		type = '',
		parentNodeId = '',
		availableOperators = [],
		startDrag = () => {},
		onChanged,
		onInUseChanged,
		onContextmenuUsed,
		onUpdateQuery,
		onDeleteSubNode,
		onChildrenStartDrag
	}: Props = $props();

	const { activeArgumentsDataGrouped_Store } = getContext(
		`${prefix}QMSWraperContext`
	) as QMSWraperContext;
	const { finalGqlArgObj_Store } = getContext(`${prefix}QMSWraperContext`) as QMSWraperContext;
	//
	let idColNameOfSelectedRow: string | undefined;
	//
	setContext(
		'choosenDisplayInterface',
		writable(activeArgumentData.chosenDisplayInterface || activeArgumentData.dd_displayInterface)
	);
	let showDescription: boolean = false;
	let labelEl: HTMLLabelElement | undefined = $state();
	let shadowEl: HTMLDivElement | undefined = $state();
	let shadowHeight: number = $state(20);
	let shadowWidth: number = $state(20);

	let labelElClone: Node | undefined = $state();

	$effect(() => {
		if (labelEl) {
			const h = labelEl.clientHeight;
			const w = labelEl.clientWidth;
			if (h !== shadowHeight) shadowHeight = h;
			if (w !== shadowWidth) shadowWidth = w;
		}
	});

	$effect(() => {
		if (shadowHeight && shadowEl) {
			if (shadowEl.style.height == '0px' || shadowEl.style.height == '') {
				shadowEl.style.height = `${shadowHeight + 18}px`;
				shadowEl.style.width = `${shadowWidth}px`;

				if (labelEl) {
					labelElClone = labelEl.cloneNode(true);
					// Casting to Element to access classList
					(labelElClone as Element).classList.remove('dnd-item');
					(labelElClone as Element).classList.add('border-2', 'border-accent');
					shadowEl.appendChild(labelElClone);
				}
			}
		}
	});
	let get_valueToDisplay = (data: ActiveArgumentData): string | undefined => {
		let value: string | undefined;
		if (getPreciseType(data.chd_dispatchValue) == 'number') {
			value = String(data.chd_dispatchValue);
		}
		if (data.dd_displayInterface == 'ENUM') {
			let chd_dispatchValue = data.chd_dispatchValue;
			// check if array
			if (Array.isArray(chd_dispatchValue) && chd_dispatchValue.length > 0) {
				value = chd_dispatchValue.join(', ');
			} else if (typeof chd_dispatchValue === 'string' && chd_dispatchValue.length > 0) {
				value = chd_dispatchValue;
			} else {
				value = undefined;
			}
		} else {
			if (Array.isArray(data.chd_dispatchValue)) {
				value = data.chd_dispatchValue.join(', ');
			} else if (typeof data.chd_dispatchValue == 'string') {
				value = string_transformerREVERSE(
					((data.chd_dispatchValue as string) || (data.defaultValue as string)) as any
				) as string;
			}
		}

		if (data.chd_dispatchValue && data.dd_displayInterface == 'geo') {
			value = '[map]';
		}

		return value;
	};
	const CPItemContext = getContext(`${prefix}CPItemContext`) as any;
	const CPItem = CPItemContext?.CPItem;
	let expandedVersion: boolean = $state(!!CPItemContext);
	let valueToDisplay: string | undefined = $derived(get_valueToDisplay(activeArgumentData));
	const outermostQMSWraperContext = getContext(
		`${prefix}OutermostQMSWraperContext`
	) as QMSWraperContext;
	const { mergedChildren_QMSWraperCtxData_Store } = outermostQMSWraperContext;

	const handleChanged = (detail: Partial<ActiveArgumentData>): void => {
		// Reassign the prop to trigger Svelte 5 reactivity for bound parent state.
		activeArgumentData = { ...activeArgumentData, ...detail };

		const isValid: boolean = argumentCanRunQuery(activeArgumentData);
		const isInUse: boolean | undefined = activeArgumentData.inUse;
		const isENUM: boolean = activeArgumentData.dd_displayInterface == 'ENUM';
		if (!isInUse && isValid) {
			inUse_set(true);
		} else if (setNotInUseIfNotValidAndENUM && isInUse && isENUM && !isValid) {
			inUse_set(false);
		} else if (setNotInUseIfNotValid && isInUse && !isValid) {
			inUse_set(false);
		}
		onChanged?.(detail);
		updateActiveArgument();
	};
	const handleClickOutside = (): void => {
		//
		//expandedVersion = false; //!!! this is causing the expanded version to disappear when you click outside of it,but sometimes,is not desirable like when another modal with choises opens up and if you click on anything that upper modal disappears.
	};

	const updateActiveArgument = (): void => {
		if (!CPItemContext) {
			activeArgumentsDataGrouped_Store.update_activeArgument(activeArgumentData, group.group_name);
			finalGqlArgObj_Store.regenerate_groupsAndfinalGqlArgObj();
		}
		//update the activeArgumentsDataGrouped_StoreForCPItem and related
		if (CPItem) {
			const QMSWraperCtxData_StoreForCPItem = $mergedChildren_QMSWraperCtxData_Store.find(
				(currCtx: any) => {
					return currCtx.stepsOfFields.join() == CPItem.stepsOfFieldsThisAppliesTo.join();
				}
			);
			const activeArgumentsDataGrouped_StoreForCPItem =
				QMSWraperCtxData_StoreForCPItem.activeArgumentsDataGrouped_Store;
			activeArgumentsDataGrouped_StoreForCPItem.update_activeArgument(
				activeArgumentData,
				group.group_name
			);
			QMSWraperCtxData_StoreForCPItem.finalGqlArgObj_Store.regenerate_groupsAndfinalGqlArgObj(); //!!!is not enough to rerun query it seems
		}
	};
	const inUse_set = (inUse: boolean): void => {
		activeArgumentData.inUse = inUse;
		updateActiveArgument();

		onInUseChanged?.();
		//finalGqlArgObj_Store.regenerate_groupsAndfinalGqlArgObj();
	};
	const inUse_toggle = (): void => {
		inUse_set(!activeArgumentData.inUse);
	};
	let showModal: boolean = $state(false);
	const mutationVersion = getContext('mutationVersion') as Writable<any>;
	const showInputField = getContext('showInputField') as Writable<any>;

	let activeArgumentsContext = getContext(`${prefix}activeArgumentsContext`);
	let MainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const schemaData = MainWraperContext?.schemaData;
	// const nodeRootType = getRootType(null, activeArgumentData.dd_rootName, schemaData); // schemaData might be null here if context is missing, careful
	let showSelectModal: boolean = $state(false);
	const OutermostQMSWraperContext = getContext(
		`${prefix}OutermostQMSWraperContext`
	) as QMSWraperContext;

	const { QMSFieldToQMSGetMany_Store } = OutermostQMSWraperContext;
	let selectedQMS = $state();
	$effect(() => {
		if ($QMSFieldToQMSGetMany_Store.length > 0) {
			selectedQMS = QMSFieldToQMSGetMany_Store.getObj({
				nodeOrField: node
			})?.getMany?.selectedQMS;
		}
	});
	const nodeContext_forDynamicData = getContext(`${prefix}nodeContext_forDynamicData`) as any;
	let selectedRowsColValues = nodeContext_forDynamicData?.selectedRowsColValues;
</script>

<SelectModal
	onDeleteSubNode={(detail) => {
		onDeleteSubNode?.(detail);
		//
	}}
	bind:showSelectModal
	{onUpdateQuery}
	bind:nodes={nodes as any}
	{onChanged}
	onChildrenStartDrag={startDrag}
	{originalNodes}
	{type}
	node={node ?? (activeArgumentData as any)}
	parentNode={parentNode as any}
	{parentNodeId}
	{availableOperators}
	{group}
/>
<Modal
	bind:show={showModal}
	showApplyBtn={false}
	onCancel={() => {
		showModal = false;
	}}
>
	<div class="space-y-6">
		<div class="flex items-center justify-center">
			<Badge variant="secondary" class="px-3 py-1 text-base font-bold">
				{activeArgumentData.stepsOfFields[activeArgumentData.stepsOfFields.length - 1]}
			</Badge>
		</div>

		<div class="flex flex-wrap items-center justify-center gap-6">
			{#if parentNode?.inputFields?.some((inputField) => inputField.dd_displayName == '_not')}
				<div class="flex items-center space-x-2">
					<Switch id="not-toggle" bind:checked={isNot} onCheckedChange={() => onContextmenuUsed?.()} />
					<Label for="not-toggle">Not</Label>
				</div>
			{/if}

			<div class="flex items-center space-x-2">
				<Switch
					id="active-toggle"
					checked={activeArgumentData?.inUse}
					onCheckedChange={(checked) => inUse_set(checked)}
				/>
				<Label for="active-toggle">Active</Label>
			</div>

			<Button
				variant="destructive"
				size="sm"
				class="gap-2"
				onclick={() => {
					activeArgumentsDataGrouped_Store.delete_activeArgument(
						activeArgumentData,
						group.group_name
					);
					finalGqlArgObj_Store.regenerate_groupsAndfinalGqlArgObj();
					showModal = false;
				}}
			>
				<Trash2 class="h-4 w-4" /> Delete
			</Button>

			{#if !CPItemContext}
				<AddNodeToControlPanel {node} />
			{/if}
			{#if CPItemContext}
				<GroupDescriptionAndControls hasGroup_argsNode={undefined} />
			{/if}
		</div>

		<div class="rounded-lg border bg-muted/30 p-4">
			<AutoInterface
				alwaysOn_interfacePicker
				typeInfo={activeArgumentData}
				onChanged={(detail: any) => {
					handleChanged(detail);
				}}
			/>
		</div>

		<div class="text-sm text-muted-foreground">
			<Description QMSInfo={activeArgumentData} {parentNode} {node} />
		</div>

		<div class="mt-4 rounded-lg border bg-background p-4">
			<Label class="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Type Definition</Label>
			<div class="overflow-x-auto">
				<Type
					index={0}
					type={activeArgumentData}
					template="default"
					depth={0}
					oncolAddRequest={(e) => {}}
				/>
			</div>
		</div>
	</div>
</Modal>

<!-- svelte-ignore a11y_label_has_associated_control -->
<label
	use:clickOutside
	onclick_outside={handleClickOutside}
	class="group/arg pointer-events-auto relative flex items-center rounded-lg border transition-all hover:border-primary/50 {group.group_isRoot
		? ' w-min min-w-fit'
		: 'w-min-fit '} {!expandedVersion ? ' pr-1 ' : ' '} {expandedVersion ? ' pr-2 ' : ' '} {$mutationVersion
		? ' pr-2 pb-2 '
		: ' '} {!expandedVersion && !$mutationVersion ? ' md:max-w-[25vw]' : ' '} dnd-item my-1 {activeArgumentData?.inUse &&
	!$mutationVersion
		? activeArgumentData.canRunQuery
			? 'border-primary/20 bg-primary/5 ring-1 ring-primary/20'
			: 'border-destructive bg-destructive/5'
		: 'border-transparent bg-muted/40'} {$mutationVersion ? 'min-w-[80vw] p-1 md:min-w-[50vw]' : 'pr-[1px]'}"
	bind:this={labelEl}
>
	<div class="flex grow items-center">
		<div class="flex {$mutationVersion ? 'flex-col' : ''} w-full items-center space-x-0">
			<div class="flex grow items-center text-xs select-none">
				<Button
					variant="ghost"
					size="xs"
					class="h-7 rounded-md px-2 text-[10px] font-medium transition-colors {activeArgumentData.inUse
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'} {isNot
						? 'bg-destructive/10 text-destructive'
						: ''} {selectedQMS ? 'text-secondary font-bold' : ''}"
					onclick={() => (showModal = true)}
					oncontextmenu={(e) => {
						if (e.target === e.currentTarget) {
							e.stopPropagation();
							e.preventDefault();
							showSelectModal = !showSelectModal;
							expandedVersion = !expandedVersion;
						}
					}}
				>
					<span class="truncate">{activeArgumentData.stepsOfFields[activeArgumentData.stepsOfFields.length - 1]}</span>
					{#if activeArgumentData.dd_NON_NULL}
						<Asterisk class="ml-0.5 h-2 w-2 text-primary" />
					{/if}
				</Button>

				{#if !expandedVersion && !$mutationVersion && !$showInputField}
					<Button
						variant="ghost"
						size="xs"
						class="mx-1 h-6 shrink-0 truncate px-1 text-[10px] font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
						onclick={(e) => {
							if (e.target === e.currentTarget) {
								e.stopPropagation();
								e.preventDefault();
								expandedVersion = true;
							}
						}}
					>
						{valueToDisplay || '...'}
					</Button>
				{/if}
			</div>

			{#if expandedVersion || $mutationVersion || $showInputField}
				<div class="flex-1">
					{#if $selectedRowsColValues?.length > 0}
						<SelectedRowsDisplay />
					{:else}
						<div class="pl-1">
							<AutoInterface
								typeInfo={activeArgumentData}
								onChanged={(detail: any) => {
									handleChanged(detail);
								}}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</label>

{#if activeArgumentData[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
	<div
		class="pointer-events-none absolute top-0 left-0 z-50 ml-8 h-full w-11/12 rounded-lg border-2 border-dashed border-primary bg-primary/5"
		id="shadowEl"
		bind:this={shadowEl}
	></div>
{/if}
