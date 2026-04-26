<script lang="ts">
	import { page } from '$app/stores';
	import MainWraper from '$lib/components/MainWraper.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import * as SidebarUI from '$lib/components/ui/sidebar/index.ts';
	import { localEndpoints } from '$lib/stores/testData/testEndpoints';
	import { localStorageEndpoints } from '$lib/stores/endpointsStore';
	import type { AvailableEndpoint } from '$lib/types';
	import { Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let endpointConfiguration = $state<AvailableEndpoint | undefined>();
	let endpointid = $state<string>('');
	let isLoading = $state(true);

	$effect(() => {
		endpointid = $page.params.endpointid ?? '';

		if (endpointid) {
			let found = localEndpoints.find((endpoint) => endpoint.id == endpointid);

			if (!found && $localStorageEndpoints) {
				found = $localStorageEndpoints.find((endpoint) => endpoint.id == endpointid);
			}

			if (!found) {
				if (endpointid.startsWith('localEndpoint--')) {
					found = localEndpoints.find((endpoint) => endpoint.id == endpointid.split('--')[1]);
				} else if (endpointid.startsWith('localstorageEndpoint--') && $localStorageEndpoints) {
					found = $localStorageEndpoints.find(
						(endpoint) => endpoint.id == endpointid.split('--')[1]
					);
				}
			}

			endpointConfiguration = found;
			isLoading = false;
		}
	});
</script>

{#if endpointid}
	{#if isLoading}
		<div class="flex h-screen w-full items-center justify-center">
			<Loader2 class="h-8 w-8 animate-spin text-primary" />
		</div>
	{:else if endpointConfiguration}
		<MainWraper endpointInfoProvided={endpointConfiguration}>
			<SidebarUI.Provider>
				<Sidebar />
				<SidebarUI.Inset class="flex flex-1 flex-col overflow-hidden">
					<header class="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
						<SidebarUI.Trigger class="-ml-1" />
					</header>
					<main class="flex flex-1 flex-col overflow-hidden bg-muted/40">
						{@render children?.()}
					</main>
				</SidebarUI.Inset>
			</SidebarUI.Provider>
		</MainWraper>
	{:else}
		<div class="flex h-screen w-full items-center justify-center">
			<div class="text-center">
				<h2 class="text-xl font-bold">Endpoint Not Found</h2>
				<p class="py-4">Could not find configuration for ID: {endpointid}</p>
				<Button href="/endpoints">Back to Endpoints</Button>
			</div>
		</div>
	{/if}
{/if}
