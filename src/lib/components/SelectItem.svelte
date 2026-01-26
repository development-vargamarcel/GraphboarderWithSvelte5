<script lang="ts">
	import { run } from 'svelte/legacy';
	import QmsWraper from '$lib/components/QMSWraper.svelte';
	import { getContext } from 'svelte';
	import type { QMSMainWraperContext, QMSWraperContext, FieldWithDerivedData } from '$lib/types';
	import ComponentForLayout from '../../routes/endpoints/[endpointid]/queries/[queryName]/ComponentForLayout.svelte';

	interface Props {
		prefix?: string;
		QMS_info: any;
		enableMultiRowSelectionState?: boolean;
		rowSelectionState: any;
		QMSWraperContext?: any;
		node: any;
		onRowSelectionChange?: (detail: any) => void;
		onRowClicked?: (detail: any) => void;
	}

	let {
		prefix = '',
		QMS_info = $bindable(),
		enableMultiRowSelectionState = true,
		rowSelectionState,
		QMSWraperContext: QMSWraperContextBound = $bindable(),
		node,
		onRowSelectionChange,
		onRowClicked
	}: Props = $props();

	if (QMSWraperContextBound === undefined) {
		QMSWraperContextBound = {};
	}

	let QMSMainWraperContextVar = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const endpointInfo = QMSMainWraperContextVar?.endpointInfo;
	const schemaData = QMSMainWraperContextVar?.schemaData;
	const OutermostQMSWraperContext = getContext(
		`${prefix}OutermostQMSWraperContext`
	) as QMSWraperContext;
	const { QMSFieldToQMSGetMany_Store } = OutermostQMSWraperContext;
	let getManyQMS = $state<FieldWithDerivedData>();
	run(() => {
		if ($QMSFieldToQMSGetMany_Store.length > 0) {
			getManyQMS = QMSFieldToQMSGetMany_Store.getObj({
				nodeOrField: node
			})?.getMany?.selectedQMS;
			if (getManyQMS) {
			}
		}
	});
</script>

{#key getManyQMS}
	{#if getManyQMS}
		<QmsWraper
			bind:QMSWraperContext={QMSWraperContextBound}
			QMSName={getManyQMS.dd_displayName}
			initialGqlArgObj={{}}
			QMSType="query"
			tableColsData_StoreInitialValue={[]}
		>
			<ComponentForLayout
				{rowSelectionState}
				{enableMultiRowSelectionState}
				{onRowSelectionChange}
				{onRowClicked}
			/>
		</QmsWraper>{/if}
{/key}

<!-- currentQMS_info={endpointInfo.get_qmsNameForObjective(QMS_info, schemaData, 'getMany')} -->
