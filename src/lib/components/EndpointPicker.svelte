<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	interface Props {
		endpoints: any[];
	}

	let { endpoints }: Props = $props();

	const handleEndpointClick = (endpoint) => {
		goto(`${base}/endpoints/${endpoint.id}`);
	};
</script>

{#if endpoints.length === 0}
	<div class="text-center p-10 bg-base-100 rounded-lg border border-base-200 shadow-sm">
		<i class="bi bi-inbox text-4xl text-base-content/30 mb-4 block"></i>
		<h3 class="text-lg font-semibold opacity-70">No Endpoints Found</h3>
		<p class="text-base-content/60 mt-2">Add a new endpoint to get started.</p>
	</div>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each endpoints as endpoint}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer border border-base-200"
				onclick={() => handleEndpointClick(endpoint)}
			>
				<div class="card-body">
					<div class="flex items-start justify-between gap-2">
						<h2 class="card-title truncate flex-1" title={endpoint.id}>
							<i class="bi bi-hdd-network text-primary"></i>
							{endpoint.id}
						</h2>
						{#if endpoint.isMantained}
							<div class="badge badge-success badge-sm">Maintained</div>
						{:else}
							<div class="badge badge-warning badge-sm">Unmaintained</div>
						{/if}
					</div>
					<p class="text-xs opacity-50 truncate font-mono bg-base-200 p-1 rounded" title={endpoint.url}>
						{endpoint.url}
					</p>
					{#if endpoint.description}
						<p class="text-sm mt-2 line-clamp-2 text-base-content/80">{endpoint.description}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
