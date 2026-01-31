<script lang="ts">
	import type { EndpointInfoStore } from '$lib/types';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	interface Props {
		endpointInfo: EndpointInfoStore;
		onClose: () => void;
	}

	let { endpointInfo, onClose }: Props = $props();

	let headersString = $state('{}');
	let error = $state<string | null>(null);

	onMount(() => {
		const currentHeaders = get(endpointInfo)?.headers || {};
		headersString = JSON.stringify(currentHeaders, null, 2);
	});

	const save = () => {
		try {
			const headers = JSON.parse(headersString);
			endpointInfo.update((info) => ({
				...info,
				headers
			}));
			error = null;
			onClose();
		} catch (e) {
			error = (e as Error).message;
		}
	};
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-lg font-bold">Edit Headers</h3>
	<p class="text-sm text-gray-500">
		Modify headers for the current session. These headers will be used for all subsequent requests.
	</p>
	<textarea
		class="textarea-bordered textarea h-64 font-mono text-sm"
		bind:value={headersString}
		placeholder={'{ "Authorization": "Bearer ..." }'}
	></textarea>
	{#if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{/if}
	<div class="flex justify-end gap-2">
		<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
		<button class="btn btn-primary" onclick={save}>Save</button>
	</div>
</div>
