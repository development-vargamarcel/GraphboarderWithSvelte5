<script lang="ts">
	import { setValueAtPath } from '$lib/utils/usefulFunctions';
	import { getContext, untrack } from 'svelte';
	import _ from 'lodash';
	interface Props {
		prefix?: string;
		QMSWraperCtxDataCurrent: any;
	}

	let { prefix = '', QMSWraperCtxDataCurrent }: Props = $props();
	/////////////////
	import type { QMSWraperContext } from '$lib/types/index';

	const { finalGqlArgObj_Store, stepsOfFields, paginationState_derived } = QMSWraperCtxDataCurrent;
	const OutermostQMSWraperContext = getContext(
		`${prefix}OutermostQMSWraperContext`
	) as QMSWraperContext;
	const { mergedChildren_finalGqlArgObj_Store } = OutermostQMSWraperContext;
	/////////////////
	const QMSarguments = $derived(
		$finalGqlArgObj_Store?.final_canRunQuery
			? { ...$finalGqlArgObj_Store.finalGqlArgObj, ...$paginationState_derived }
			: undefined
	);

	$effect.pre(() => {
		if (QMSarguments === undefined && !$paginationState_derived) return;
		const argsSnapshot = QMSarguments;
		untrack(() => {
			mergedChildren_finalGqlArgObj_Store.update((value: Record<string, unknown>) => {
				const next = setValueAtPath(
					value,
					[...stepsOfFields, 'QMSarguments'],
					argsSnapshot
				) as Record<string, unknown>;
				return _.isEqual(value, next) ? value : next;
			});
		});
	});
</script>
