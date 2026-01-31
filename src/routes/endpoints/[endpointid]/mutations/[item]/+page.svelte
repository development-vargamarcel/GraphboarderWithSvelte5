<script>
	import { page } from '$app/stores';
	import Page from '$lib/components/Page.svelte';
	import MutationExample from '../MutationExample.svelte';
	import QMSWraper from '$lib/components/QMSWraper.svelte';
	import { historyQueries } from '$lib/stores/historyQueriesStore';
	import { decodeState } from '$lib/utils/stateEncoder';

	let initialGqlArgObj = $state({});

	$effect(() => {
		const historyId = $page.url.searchParams.get('historyId');
		const encodedState = $page.url.searchParams.get('state');

		if (historyId) {
			const historyItem = historyQueries.get(historyId);
			if (historyItem) {
				console.debug('Restoring mutation history:', historyItem);
				if (historyItem.args) initialGqlArgObj = historyItem.args;
			}
		} else if (encodedState) {
			const decoded = decodeState(encodedState);
			if (decoded) {
				console.debug('Restoring mutation from shared state:', decoded);
				if (decoded.args) initialGqlArgObj = decoded.args;
			}
		}
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
