<!--
	@component
	EndpointPicker

	A component that allows users to select from a list of available GraphQL endpoints.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { removeEndpoint } from '$lib/stores/endpointsStore';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import { addToast } from '$lib/stores/toastStore';
	import type { AvailableEndpoint } from '$lib/types';
	import { checkEndpointHealth } from '$lib/utils/healthCheck';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Search, RefreshCw, Plus, HardDrive, Copy, Pencil, Trash, Inbox, Circle } from 'lucide-svelte';

	interface Props {
		endpoints: AvailableEndpoint[];
		onAddEndpoint?: () => void;
		onEditEndpoint?: (endpoint: AvailableEndpoint) => void;
		onDuplicateEndpoint?: (endpoint: AvailableEndpoint) => void;
	}

	let { endpoints, onAddEndpoint, onEditEndpoint, onDuplicateEndpoint }: Props = $props();

	let searchTerm = $state('');
	let sortOption = $state<'name-asc' | 'name-desc'>('name-asc');
	let showDeleteModal = $state(false);
	let endpointToDelete = $state<AvailableEndpoint | null>(null);

	// Health Check State
	let healthStatus = $state<Record<string, { healthy: boolean; latency?: number; error?: string }>>(
		{}
	);
	let isChecking = $state<Record<string, boolean>>({});

	const runHealthCheck = async (endpoint: AvailableEndpoint) => {
		if (isChecking[endpoint.id]) return;
		isChecking[endpoint.id] = true;
		healthStatus = { ...healthStatus };

		const result = await checkEndpointHealth(endpoint.url, endpoint.headers);
		healthStatus[endpoint.id] = result;
		isChecking[endpoint.id] = false;
		healthStatus = { ...healthStatus };
	};

	$effect(() => {
		endpoints.forEach((ep) => {
			if (!healthStatus[ep.id] && !isChecking[ep.id]) {
				runHealthCheck(ep);
			}
		});
	});

	let filteredEndpoints = $derived(
		endpoints
			.filter((endpoint) => {
				const term = searchTerm.toLowerCase();
				return (
					endpoint.id.toLowerCase().includes(term) ||
					endpoint.url.toLowerCase().includes(term) ||
					(endpoint.description && endpoint.description?.toLowerCase().includes(term))
				);
			})
			.sort((a, b) => {
				if (sortOption === 'name-asc') {
					return a.id.localeCompare(b.id);
				} else {
					return b.id.localeCompare(a.id);
				}
			})
	);

	const handleEndpointClick = (endpoint: AvailableEndpoint) => {
		goto(`${base}/endpoints/${endpoint.id}`);
	};

	const confirmDelete = (endpoint: AvailableEndpoint, event: Event) => {
		event.stopPropagation();
		endpointToDelete = endpoint;
		showDeleteModal = true;
	};

	const handleDelete = () => {
		if (endpointToDelete) {
			removeEndpoint(endpointToDelete.id);
			addToast(`Endpoint '${endpointToDelete.id}' deleted`, 'success');
			showDeleteModal = false;
			endpointToDelete = null;
		}
	};
</script>

<div class="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
	<div class="flex w-full flex-1 gap-4 md:w-auto">
		<div class="relative w-full max-w-md">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				bind:value={searchTerm}
				placeholder="Search endpoints..."
				class="pl-10"
			/>
		</div>
		{#if endpoints.length > 0 && filteredEndpoints.length === 0}
			<Button variant="ghost" onclick={() => (searchTerm = '')}>Clear Search</Button>
		{/if}
	</div>

	<div class="flex w-full items-center justify-end gap-2 md:w-auto">
		<Button
			variant="ghost"
			size="sm"
			class="gap-2"
			onclick={() => {
				healthStatus = {};
				endpoints.forEach((ep) => runHealthCheck(ep));
			}}
		>
			<RefreshCw class="h-4 w-4" /> Refresh Status
		</Button>
		<select bind:value={sortOption} class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[180px]">
			<option value="name-asc">Name (A-Z)</option>
			<option value="name-desc">Name (Z-A)</option>
		</select>
	</div>
</div>

{#if endpoints.length === 0}
	<div class="rounded-lg border border-dashed p-20 text-center flex flex-col items-center justify-center">
		<Inbox class="h-12 w-12 text-muted-foreground/50 mb-4" />
		<h3 class="text-lg font-semibold">No Endpoints Found</h3>
		<p class="mt-2 mb-6 text-muted-foreground">Add a new endpoint to get started.</p>
		{#if onAddEndpoint}
			<Button onclick={onAddEndpoint} class="gap-2">
				<Plus class="h-4 w-4" /> Add Endpoint
			</Button>
		{/if}
	</div>
{:else if filteredEndpoints.length === 0}
	<div class="p-20 text-center">
		<h3 class="text-lg font-semibold">No matching endpoints found</h3>
		<p class="mt-2 text-muted-foreground">Try adjusting your search terms.</p>
		<Button variant="ghost" size="sm" class="mt-4" onclick={() => (searchTerm = '')}>Clear Search</Button>
	</div>
{:else}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredEndpoints as endpoint}
			<Card.Root
				class="group relative cursor-pointer transition-all hover:shadow-md"
				onclick={() => handleEndpointClick(endpoint)}
			>
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-2 pr-12">
						<Card.Title class="flex items-center gap-2 text-lg truncate">
							<HardDrive class="h-5 w-5 text-primary" />
							{endpoint.id}
						</Card.Title>
						{#if endpoint.isMaintained}
							<Badge variant="secondary" class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Maintained</Badge>
						{:else}
							<Badge variant="outline">User Defined</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2 mt-1">
						<code class="flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
							{endpoint.url}
						</code>

						<!-- Health Status Indicator -->
						<Badge variant="outline" class="gap-1.5 py-0.5 px-2 font-normal">
							{#if isChecking[endpoint.id]}
								<span class="animate-spin h-2 w-2 rounded-full border-2 border-primary border-t-transparent"></span>
							{:else if healthStatus[endpoint.id]?.healthy}
								<Circle class="h-2 w-2 fill-green-500 text-green-500" />
								<span>{healthStatus[endpoint.id]?.latency}ms</span>
							{:else if healthStatus[endpoint.id]}
								<Circle class="h-2 w-2 fill-destructive text-destructive" />
								<span>Offline</span>
							{:else}
								<Circle class="h-2 w-2 fill-muted text-muted" />
								<span>Pending</span>
							{/if}
						</Badge>
					</div>
				</Card.Header>

				{#if endpoint.description}
					<Card.Content class="pb-4">
						<p class="text-sm text-muted-foreground line-clamp-2">
							{endpoint.description}
						</p>
					</Card.Content>
				{/if}

				<div class="absolute top-4 right-4 z-20 flex gap-1 invisible group-hover:visible transition-all">
					{#if onDuplicateEndpoint}
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7"
							onclick={(e) => {
								e.stopPropagation();
								onDuplicateEndpoint(endpoint);
							}}
							title="Duplicate"
						>
							<Copy class="h-4 w-4" />
						</Button>
					{/if}
					{#if !endpoint.isMaintained}
						{#if onEditEndpoint}
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								onclick={(e) => {
									e.stopPropagation();
									onEditEndpoint(endpoint);
								}}
								title="Edit"
							>
								<Pencil class="h-4 w-4" />
							</Button>
						{/if}
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 text-destructive hover:text-destructive"
							onclick={(e) => confirmDelete(endpoint, e)}
							title="Delete"
						>
							<Trash class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</Card.Root>
		{/each}
	</div>
{/if}

<ConfirmationModal
	bind:show={showDeleteModal}
	onConfirm={handleDelete}
	onCancel={() => (showDeleteModal = false)}
/>
