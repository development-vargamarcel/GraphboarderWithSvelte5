<script lang="ts">
	import Type from '$lib/components/Type.svelte';
	import Description from './Description.svelte';
	import { getContext, setContext } from 'svelte';
	import Arg from '$lib/components/Arg.svelte';
	import {
		getQMSWraperCtxDataGivenControlPanelItem,
		getRootType
	} from '$lib/utils/usefulFunctions';
	import { add_activeArgumentOrContainerTo_activeArgumentsDataGrouped } from '$lib/stores/QMSHandling/activeArgumentsDataGrouped_Store';
	import ManyToAllSelectInterfaceDefinition from './ManyToAllSelectInterfaceDefinition.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from 'lucide-react-svelte';

	interface Props {
		group: any;
		argsInfo: any;
		activeArgumentsDataGrouped: any;
		node: any;
		prefix?: string;
		parent_inputFields: any;
		onUpdateQuery?: () => void;
	}

	let {
		group = $bindable(),
		argsInfo,
		activeArgumentsDataGrouped,
		node,
		prefix = '',
		parent_inputFields,
		onUpdateQuery
	}: Props = $props();

	const groupName = group.group_name;
	const hasGroup_argsNode = group.group_argsNode;

	const OutermostQMSWraperContext = getContext(`${prefix}OutermostQMSWraperContext`) as any;
	let pathIsInCP = false;
	const nodeContext = getContext(`${prefix}nodeContext`) as any;
	if (nodeContext) {
		pathIsInCP = nodeContext?.pathIsInCP;
	}
	let nodeIsInCP = false;
	const CPItemContext = getContext(`${prefix}CPItemContext`) as any;
	if (CPItemContext?.CPItem.nodeId == node.id) {
		setContext(`${prefix}nodeContext`, { pathIsInCP: true });
		nodeIsInCP = true;
	}
	const isCPChild = CPItemContext ? true : false;

	let correctQMSWraperContext;
	if (isCPChild) {
		correctQMSWraperContext = getQMSWraperCtxDataGivenControlPanelItem(
			CPItemContext?.CPItem,
			OutermostQMSWraperContext
		);
	} else {
		correctQMSWraperContext = getContext(`${prefix}QMSWraperContext`) as any;
	}
	const { activeArgumentsDataGrouped_Store } = correctQMSWraperContext;

	let rootArgs = argsInfo.filter((arg: any) => {
		return arg.dd_isRootArg;
	});
	let QMSMainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as any;
	const schemaData = QMSMainWraperContext?.schemaData;

	let groupArgsPossibilities = $derived.by(() => {
		let result: any[] = [];
		if (group.group_isRoot) {
			result = rootArgs;
		} else if (node?.inputFields) {
			result = node?.inputFields;
		} else if (parent_inputFields) {
			result = parent_inputFields;
		} else {
			result = getRootType(null, group.dd_rootName, schemaData)?.inputFields || [];
		}
		if (!result || result.length === 0) {
			result = node?.args || [];
		}
		return result;
	});

	let predefinedFirstSteps = group.group_isRoot ? [] : [group.group_name];
	const endpointInfo = QMSMainWraperContext?.endpointInfo;
</script>

<div class="flex w-full min-w-full flex-col overflow-x-auto p-1">
	{#if hasGroup_argsNode}
		<Button
			variant="outline"
			size="sm"
			class="mb-4 h-8 w-full border-dashed"
			onclick={() => {
				let randomNr = Math.random();
				const newContainerData = {
					...node,
					addDefaultFields: true,
					dd_displayName: undefined,
					id: randomNr,
					operator: OutermostQMSWraperContext?.QMSType == 'mutation' ? 'bonded' : '~spread~',
					not: false,
					isMain: false,
					items: []
				};
				add_activeArgumentOrContainerTo_activeArgumentsDataGrouped(
					newContainerData,
					groupName,
					node?.id,
					activeArgumentsDataGrouped,
					endpointInfo,
					group
				);
				group = group;
			}}
		>
			<Plus class="mr-2 h-4 w-4" />
			{OutermostQMSWraperContext?.QMSType == 'mutation' ? 'Add Item' : 'Add Container'}
		</Button>
	{/if}

	<div class="mb-4 space-y-1 rounded-md border bg-muted/20 p-2">
		{#each groupArgsPossibilities as arg, index}
			<Arg
				{index}
				type={arg}
				template="changeArguments"
				{predefinedFirstSteps}
				groupName={group.group_name}
				onArgAddRequest={(detail: any) => {
					activeArgumentsDataGrouped_Store.add_activeArgument(
						detail,
						groupName,
						node?.id,
						endpointInfo
					);
				}}
				onContainerAddRequest={(detail: any) => {
					let newContainerData = detail;
					let randomNr = Math.random();
					let newContainerDataRootType = getRootType(
						null,
						newContainerData.dd_rootName,
						schemaData
					);

					let isListContainer = newContainerData?.dd_kindList;
					let operator = isListContainer ? 'list' : 'bonded';

					newContainerData = {
						...newContainerData,
						inputFields: newContainerDataRootType?.inputFields,
						id: randomNr,
						operator,
						not: false,
						isMain: false,
						items: []
					};
					add_activeArgumentOrContainerTo_activeArgumentsDataGrouped(
						newContainerData,
						groupName,
						node?.id,
						activeArgumentsDataGrouped,
						endpointInfo,
						group
					);
					group = group;
				}}
			/>
		{/each}
	</div>

	<Description QMSInfo={node} />

	<div class="mt-4 w-full overflow-x-auto rounded-md border bg-muted/10 p-2">
		<Type index={0} type={node} template="default" depth={0} oncolAddRequest={(e) => {}} />
	</div>
</div>
