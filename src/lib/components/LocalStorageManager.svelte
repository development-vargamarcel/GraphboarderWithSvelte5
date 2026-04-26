<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import CodeEditor from '$lib/components/fields/CodeEditor.svelte';
	import { browser } from '$app/environment';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		show?: boolean;
	}

	let { show = $bindable(false) }: Props = $props();

	let storageKeys = ['localStorageEndpoints', 'historyQueries', 'favoriteQueries', 'envVars'];
	let selectedKey = $state('');
	let selectedValue = $state('');
	let viewMode = $state(false);

	let storageItems: Record<string, string> = $state({});

	const loadStorage = () => {
		if (!browser) return;
		const items: Record<string, string> = {};
		storageKeys.forEach((key) => {
			const val = localStorage.getItem(key);
			if (val) items[key] = val;
		});
		storageItems = items;
	};

	$effect(() => {
		if (show) {
			loadStorage();
			viewMode = false;
			selectedKey = '';
		}
	});

	const handleDelete = (key: string) => {
		if (confirm(`Are you sure you want to delete ${key}? This cannot be undone.`)) {
			localStorage.removeItem(key);
			loadStorage();
			if (selectedKey === key) {
				viewMode = false;
				selectedKey = '';
			}
		}
	};

	const handleView = (key: string) => {
		selectedKey = key;
		selectedValue = storageItems[key];
		try {
			selectedValue = JSON.stringify(JSON.parse(selectedValue), null, 2);
		} catch (e) {
			// keep raw if not json
		}
		viewMode = true;
	};

	const handleBack = () => {
		viewMode = false;
		selectedKey = '';
	};
</script>

<Modal bind:show modalIdentifier="local-storage-manager" showApplyBtn={false}>
	<h3 class="mb-4 text-lg font-bold">Local Storage Manager</h3>

	{#if !viewMode}
		{#if Object.keys(storageItems).length === 0}
			<p class="text-gray-500">No managed keys found in Local Storage.</p>
		{:else}
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Key</Table.Head>
							<Table.Head>Size (chars)</Table.Head>
							<Table.Head>Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each Object.entries(storageItems) as [key, value]}
							<Table.Row>
								<Table.Cell>{key}</Table.Cell>
								<Table.Cell>{value.length}</Table.Cell>
								<Table.Cell>
									<div class="flex gap-2">
										<Button variant="outline" size="sm" onclick={() => handleView(key)}>View</Button>
										<Button variant="destructive" size="sm" onclick={() => handleDelete(key)}
											>Delete</Button
										>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{/if}
	{:else}
		<div class="flex h-full flex-col gap-2">
			<div class="flex items-center justify-between">
				<h4 class="font-bold">{selectedKey}</h4>
				<Button variant="ghost" size="sm" onclick={handleBack}>Back</Button>
			</div>
			<div class="h-64 rounded border">
				<CodeEditor rawValue={selectedValue} language="json" readonly={true} />
			</div>
		</div>
	{/if}
</Modal>
