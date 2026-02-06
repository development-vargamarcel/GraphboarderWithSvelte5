<script lang="ts">
	import QMSWraper from '$lib/components/QMSWraper.svelte';
	import { getContext } from 'svelte';
	import type { QMSMainWraperContext } from '$lib/types/index';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const prefix = '';
	let qmsMainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const schemaData = qmsMainWraperContext?.schemaData;
	let queryFields = $derived($schemaData.queryFields);
</script>

{#if schemaData}
	<QMSWraper QMS_info={queryFields[0]} prefix="" extraInfo={{ isForExplorer: true }}>
		{@render children?.()}
	</QMSWraper>{/if}
