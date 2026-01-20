<script lang="ts">
	import { getStores, navigating, page, updated } from '$app/stores';

	import { onDestroy } from 'svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let origin = $page.url.origin;
	let pathname;

	let pageUnsubscribe = page.subscribe((value) => {
		pathname = value.url.pathname;
	});
	onDestroy(() => {
		pageUnsubscribe();
	});
</script>

<div class="w-full pt-2">
	{#key $page.params.queryName}
		{@render children?.()}
	{/key}
</div>
