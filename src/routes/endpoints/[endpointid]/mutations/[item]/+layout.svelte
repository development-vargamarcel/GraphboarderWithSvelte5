<script lang="ts">
	import { page } from '$app/state';

	import Page from '$lib/components/Page.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<Page
	MenuItem={true}
	CustomId={page.params.item ?? ''}
	backPath={`/endpoints/${page.params.endpointid}/mutations`}
	title={page.params.item ?? ''}
>
	{@render children?.()}
</Page>
