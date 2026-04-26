<script lang="ts">
	/**
	 * History page component.
	 * Displays a list of executed queries/mutations for the current endpoint.
	 * Allows searching, filtering, exporting, importing, and restoring history items.
	 */
	import { page } from '$app/stores';
	import { historyQueries } from '$lib/stores/historyQueriesStore';
	import { downloadJSON } from '$lib/utils/downloadUtils';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore';
	import { logger } from '$lib/utils/logger';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { Download, Upload, Trash2, RotateCcw, Info } from 'lucide-svelte';

	let endpointId = $derived($page.params.endpointid);

	let searchTerm = $state('');
	let filterType = $state('all');
	let filterStatus = $state('all');

	let history = $derived(
		$historyQueries
			.filter((q) => {
				const isEndpoint = q.endpointId === endpointId;
				const matchesSearch = q.queryName.toLowerCase().includes(searchTerm.toLowerCase());
				const matchesType = filterType === 'all' || q.type === filterType;
				const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
				return isEndpoint && matchesSearch && matchesType && matchesStatus;
			})
			.sort((a, b) => b.timestamp - a.timestamp)
	);

	const handleClear = () => {
		if (confirm('Are you sure you want to clear ALL history for ALL endpoints?')) {
			logger.info('User cleared all history');
			historyQueries.clear();
			addToast('History cleared', 'success');
		}
	};

	const handleExport = () => {
		if (history.length === 0) {
			addToast('No history to export.', 'info');
			return;
		}
		logger.info('User exported history', { count: history.length, endpointId });
		const exportData = history.map(({ id, ...rest }) => rest);
		downloadJSON(exportData, `history-${endpointId}.json`);
		addToast('History exported', 'success');
	};

	let fileInput = $state<HTMLInputElement | null>(null);

	const handleImportClick = () => {
		fileInput?.click();
	};

	const handleFileChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				if (Array.isArray(json)) {
					logger.info('User imported history', { count: json.length });
					historyQueries.importHistory(json);
					addToast(`Imported ${json.length} history items`, 'success');
				} else {
					addToast('Invalid file format: Expected an array', 'error');
				}
			} catch (err) {
				logger.error('Failed to parse history import file', err);
				addToast('Failed to parse JSON file', 'error');
			}
			target.value = '';
		};
		reader.readAsText(file);
	};

	const restoreQuery = async (q: any) => {
		const url = `/endpoints/${endpointId}/${q.type === 'query' ? 'queries' : 'mutations'}/${q.queryName}?historyId=${q.id}`;
		await goto(url);
	};

	const handleDelete = (id: string) => {
		if (confirm('Remove this history item?')) {
			historyQueries.remove(id);
			addToast('History item removed', 'success');
		}
	};
</script>

<div class="p-4">
	<div class="mb-4 flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold">History</h1>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={handleExport}>
					<Download class="mr-2 h-4 w-4" /> Export
				</Button>
				<Button variant="outline" size="sm" onclick={handleImportClick}>
					<Upload class="mr-2 h-4 w-4" /> Import
				</Button>
				<Button variant="destructive" size="sm" onclick={handleClear}>
					<Trash2 class="mr-2 h-4 w-4" /> Clear All
				</Button>
				<input
					type="file"
					bind:this={fileInput}
					onchange={handleFileChange}
					accept=".json"
					class="hidden"
				/>
			</div>
		</div>

		<div class="flex flex-col gap-2 md:flex-row">
			<Input
				type="text"
				placeholder="Search by name..."
				class="w-full md:w-1/3"
				bind:value={searchTerm}
			/>
			<select
				class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[180px]"
				bind:value={filterType}
			>
				<option value="all">All Types</option>
				<option value="query">Query</option>
				<option value="mutation">Mutation</option>
			</select>
			<select
				class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[180px]"
				bind:value={filterStatus}
			>
				<option value="all">All Statuses</option>
				<option value="success">Success</option>
				<option value="error">Error</option>
			</select>
		</div>
	</div>

	{#if history.length === 0}
		<Alert.Root>
			<Info class="h-4 w-4" />
			<Alert.Title>No history</Alert.Title>
			<Alert.Description>
				No history for this endpoint. Run some queries!
			</Alert.Description>
		</Alert.Root>
	{:else}
		<div class="overflow-x-auto rounded-md border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Status</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Executed At</Table.Head>
						<Table.Head>Duration</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each history as item (item.id)}
						<Table.Row>
							<Table.Cell>
								{#if item.status === 'success'}
									<Badge variant="default" class="bg-green-500 hover:bg-green-600">OK</Badge>
								{:else}
									<Badge variant="destructive">ERR</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="font-medium">
								<button
									class="hover:underline text-left font-bold"
									onclick={async () => await restoreQuery(item)}
								>
									{item.queryName}
								</button>
								<span class="ml-1 text-xs text-muted-foreground">({item.type})</span>
							</Table.Cell>
							<Table.Cell>{new Date(item.timestamp).toLocaleString()}</Table.Cell>
							<Table.Cell>{item.duration} ms</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="icon"
									onclick={async () => await restoreQuery(item)}
									title="Restore State"
								>
									<RotateCcw class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive"
									onclick={() => handleDelete(item.id)}
									title="Delete history item"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
