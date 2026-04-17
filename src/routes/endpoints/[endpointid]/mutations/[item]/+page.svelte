<script>
	import { page } from '$app/stores';
	import Page from '$lib/components/Page.svelte';
	import MutationExample from '../MutationExample.svelte';
	import QMSWraper from '$lib/components/QMSWraper.svelte';
	import { historyQueries } from '$lib/stores/historyQueriesStore';
	import { decodeState } from '$lib/utils/stateEncoder';

	const initialGqlArgObj = $derived.by(() => {
		const historyId = $page.url.searchParams.get('historyId');
		const encodedState = $page.url.searchParams.get('state');

		if (historyId) {
			const historyItem = historyQueries.get(historyId);
			if (historyItem?.args) {
				console.debug('Restoring mutation history:', historyItem);
				return historyItem.args;
			}
		} else if (encodedState) {
			const decoded = decodeState(encodedState);
			if (decoded?.args) {
				console.debug('Restoring mutation from shared state:', decoded);
				return decoded.args;
			}
		}
		return {};
	});
</script>

<Page MenuItem={false} CustomId="fdsfdsee" backPath="/" title={$page.params.item ?? ''}>
	{#key ($page.params.item ?? '') + ($page.url.searchParams.get('historyId') ?? '') + ($page.url.searchParams.get('state') ?? '')}
		{#if $page.params.item}
			<QMSWraper
				isOutermostQMSWraper={true}
				QMSName={$page.params.item}
				QMSType="mutation"
				{initialGqlArgObj}
			>
				<MutationExample />
			</QMSWraper>
		{/if}
	{/key}
</Page>
