<script lang="ts">
	import { page } from '$app/stores';
	import { favoriteQueries, type FavoriteQuery } from '$lib/stores/favoriteQueriesStore';
	import { downloadJSON } from '$lib/utils/downloadUtils';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore';
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import { Download, Upload, Info, Pencil, Trash2, Play, ChevronDown, ChevronRight } from 'lucide-svelte';

	let endpointId = $derived($page.params.endpointid ?? '');
	let favorites = $derived($favoriteQueries.filter((q) => q.endpointId === endpointId));

	let groupedFavorites = $derived.by(() => {
		const groups: Record<string, typeof favorites> = {};
		favorites.forEach((f) => {
			const key = f.folder || 'Uncategorized';
			if (!groups[key]) groups[key] = [];
			groups[key].push(f);
		});
		return groups;
	});

	let sortedFolders = $derived(
		Object.keys(groupedFavorites).sort((a, b) => {
			if (a === 'Uncategorized') return -1;
			if (b === 'Uncategorized') return 1;
			return a.localeCompare(b);
		})
	);

	let existingFolders = $derived(
		Array.from(new Set(favorites.map((q) => q.folder).filter(Boolean))).sort()
	);

	const handleDelete = (id: string) => {
		if (confirm('Are you sure you want to delete this favorite?')) {
			favoriteQueries.remove(id);
			addToast('Favorite deleted', 'success');
		}
	};

	const handleExport = () => {
		if (favorites.length === 0) {
			addToast('No favorites to export.', 'info');
			return;
		}
		const exportData = favorites.map(({ id, timestamp, ...rest }) => rest);
		downloadJSON(exportData, `favorites-${endpointId}.json`);
		addToast('Favorites exported', 'success');
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
					favoriteQueries.importFavorites(json);
					addToast(`Imported ${json.length} favorites`, 'success');
				} else {
					addToast('Invalid file format: Expected an array', 'error');
				}
			} catch (err) {
				console.error(err);
				addToast('Failed to parse JSON file', 'error');
			}
			target.value = '';
		};
		reader.readAsText(file);
	};

	const navigateToQuery = async (q: any) => {
		const url = `/endpoints/${endpointId}/${q.type === 'query' ? 'queries' : 'mutations'}/${q.name}`;
		await goto(url);
	};

	let showEditModal = $state(false);
	let editFavorite = $state<FavoriteQuery | null>(null);
	let editName = $state('');
	let editFolder = $state('');
	let showRenameFolderModal = $state(false);
	let renameFromFolder = $state('');
	let renameToFolder = $state('');

	const openEditModal = (favorite: FavoriteQuery) => {
		editFavorite = favorite;
		editName = favorite.name;
		editFolder = favorite.folder ?? '';
		showEditModal = true;
	};

	const closeEditModal = () => {
		showEditModal = false;
		editFavorite = null;
		editName = '';
		editFolder = '';
	};

	const handleUpdateFavorite = () => {
		if (!editFavorite) return;
		if (!editName.trim()) {
			addToast('Favorite name is required', 'error');
			return;
		}
		favoriteQueries.update(editFavorite.id, {
			name: editName,
			folder: editFolder
		});
		addToast('Favorite updated', 'success');
		closeEditModal();
	};

	const openRenameFolderModal = (folder: string) => {
		renameFromFolder = folder;
		renameToFolder = folder;
		showRenameFolderModal = true;
	};

	const closeRenameFolderModal = () => {
		showRenameFolderModal = false;
		renameFromFolder = '';
		renameToFolder = '';
	};

	const handleRenameFolder = () => {
		if (!renameFromFolder) return;
		if (renameFromFolder === 'Uncategorized') {
			addToast('Cannot rename the Uncategorized folder', 'error');
			return;
		}
		favoriteQueries.renameFolder(endpointId, renameFromFolder, renameToFolder);
		addToast(`Folder "${renameFromFolder}" updated`, 'success');
		closeRenameFolderModal();
	};

	let expandedFolders = $state<Record<string, boolean>>({});
	$effect(() => {
		sortedFolders.forEach(folder => {
			if (expandedFolders[folder] === undefined) {
				expandedFolders[folder] = true;
			}
		});
	});

	const toggleFolder = (folder: string) => {
		expandedFolders[folder] = !expandedFolders[folder];
	};
</script>

<div class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Favorites</h1>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={handleExport}>
				<Download class="mr-2 h-4 w-4" /> Export
			</Button>
			<Button variant="outline" size="sm" onclick={handleImportClick}>
				<Upload class="mr-2 h-4 w-4" /> Import
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

	{#if favorites.length === 0}
		<Alert.Root>
			<Info class="h-4 w-4" />
			<Alert.Title>No favorites</Alert.Title>
			<Alert.Description>
				No favorites saved for this endpoint yet. Save queries from the execution view.
			</Alert.Description>
		</Alert.Root>
	{:else}
		{#each sortedFolders as folder (folder)}
			<div class="mb-2 overflow-hidden rounded-lg border border-border bg-card">
				<button
					class="flex w-full items-center justify-between p-4 text-left font-medium transition-colors hover:bg-muted/50"
					onclick={() => toggleFolder(folder)}
				>
					<div class="flex items-center gap-2">
						{#if expandedFolders[folder]}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
						<span class="text-lg font-semibold">{folder}</span>
						<Badge variant="outline" class="ml-2">
							{groupedFavorites[folder].length}
						</Badge>
					</div>
					{#if folder !== 'Uncategorized'}
						<Button
							variant="ghost"
							size="icon"
							class="h-8 w-8"
							onclick={(event) => {
								event.stopPropagation();
								openRenameFolderModal(folder);
							}}
							title="Rename folder"
						>
							<Pencil class="h-4 w-4" />
						</Button>
					{/if}
				</button>

				{#if expandedFolders[folder]}
					<div class="border-t border-border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Type</Table.Head>
									<Table.Head>Saved At</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each groupedFavorites[folder] as fav (fav.id)}
									<Table.Row>
										<Table.Cell class="font-medium">
											<button
												class="hover:underline text-left font-bold text-primary"
												onclick={async () => await navigateToQuery(fav)}
											>
												{fav.name}
											</button>
										</Table.Cell>
										<Table.Cell>
											<Badge variant={fav.type === 'query' ? 'default' : 'secondary'}>
												{fav.type}
											</Badge>
										</Table.Cell>
										<Table.Cell class="text-xs text-muted-foreground">{new Date(fav.timestamp).toLocaleString()}</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8"
													onclick={async () => await navigateToQuery(fav)}
													title="Run"
												>
													<Play class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8"
													onclick={() => openEditModal(fav)}
													title="Edit"
												>
													<Pencil class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 text-destructive hover:text-destructive"
													onclick={() => handleDelete(fav.id)}
													title="Delete"
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<Modal bind:show={showEditModal} showApplyBtn={false} onCancel={closeEditModal}>
	<div class="space-y-4">
		<h2 class="text-lg font-semibold">Edit Favorite</h2>
		<div class="space-y-2">
			<label class="text-sm font-medium" for="favorite-name">Name</label>
			<Input id="favorite-name" bind:value={editName} placeholder="Favorite name" />
		</div>
		<div class="space-y-2">
			<label class="text-sm font-medium" for="favorite-folder">Folder (optional)</label>
			<Input id="favorite-folder" bind:value={editFolder} list="favorite-folders" placeholder="Folder name" />
			<datalist id="favorite-folders">
				{#each existingFolders as folder}
					<option value={folder}></option>
				{/each}
			</datalist>
			<p class="text-xs text-muted-foreground">Leave blank to move to "Uncategorized".</p>
		</div>
		<div class="flex justify-end gap-2">
			<Button variant="ghost" onclick={closeEditModal}>Cancel</Button>
			<Button onclick={handleUpdateFavorite}>Save</Button>
		</div>
	</div>
</Modal>

<Modal bind:show={showRenameFolderModal} showApplyBtn={false} onCancel={closeRenameFolderModal}>
	<div class="space-y-4">
		<h2 class="text-lg font-semibold">Rename Folder</h2>
		<div class="space-y-2">
			<label class="text-sm font-medium" for="rename-from-folder">Current folder</label>
			<Input id="rename-from-folder" value={renameFromFolder} disabled />
		</div>
		<div class="space-y-2">
			<label class="text-sm font-medium" for="rename-to-folder">New folder name</label>
			<Input id="rename-to-folder" bind:value={renameToFolder} placeholder="Folder name" />
		</div>
		<div class="flex justify-end gap-2">
			<Button variant="ghost" onclick={closeRenameFolderModal}>Cancel</Button>
			<Button onclick={handleRenameFolder}>Save</Button>
		</div>
	</div>
</Modal>
