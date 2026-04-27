<script lang="ts">
	import Type from '$lib/components/Type.svelte';
	import Page from '$lib/components/Page.svelte';
	import { sortingFunctionMutipleColumnsGivenArray } from '$lib/utils/usefulFunctions';
	import { getContext } from 'svelte';
	import ExplorerTable from '$lib/components/ExplorerTable.svelte';
	import EditTableBaseNameModal from '$lib/components/EditTableBaseNameModal.svelte';
	import { addToast } from '$lib/stores/toastStore';
	import type { QMSMainWraperContext } from '$lib/types/index';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Search, ListFilter, LayoutList, Table as TableIcon, Clipboard, Pencil, RefreshCw, CaseSensitive } from 'lucide-svelte';

	const prefix = '';

	let qmsMainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as QMSMainWraperContext;
	const schemaData = qmsMainWraperContext?.schemaData;

	let rootTypes = $schemaData.rootTypes;
	let queries = $schemaData.queryFields;
	let mutations = $schemaData.mutationFields;
	let baseDataToShow = $state<any[]>([]);
	let whatToShowLastUsed = $state();
	let sortingInputValue = $state('');
	let sortingArray = $derived(sortingInputValue.split(' '));
	let caseSensitive = $state(false);

	let whatToShow = $derived.by(() => {
		if (sortingArray.length == 1 && sortingArray[0] == '') {
			return baseDataToShow;
		}

		const positiveWords: string[] = [];
		const negativeWords: string[] = [];
		sortingArray.forEach((word) => {
			if (!word) return;
			if (word.startsWith('-') || word.startsWith('!')) {
				const processedWord = word.slice(1);
				if (processedWord) negativeWords.push(processedWord);
			} else {
				let processedWord;
				if (word.startsWith('+')) {
					processedWord = word.slice(1);
				} else {
					processedWord = word;
				}
				if (processedWord) positiveWords.push(processedWord);
			}
		});

		if (positiveWords.length === 0 && negativeWords.length === 0) {
			return baseDataToShow;
		}

		return baseDataToShow.filter((type) => {
			const matchesPositive =
				positiveWords.length === 0 ||
				positiveWords.some((word) => {
					if (caseSensitive) {
						return type.dd_displayName.includes(word);
					}
					return type.dd_displayName.toLowerCase().includes(word.toLowerCase());
				});

			const matchesNegative = negativeWords.some((word) => {
				if (caseSensitive) {
					return type.dd_displayName.includes(word);
				}
				return type.dd_displayName.toLowerCase().includes(word.toLowerCase());
			});

			return matchesPositive && !matchesNegative;
		});
	});

	const showRootTypes = () => {
		baseDataToShow = rootTypes?.sort((a: any, b: any) => {
			let ea = a.dd_rootName;
			let eb = b.dd_rootName;
			return sortingFunctionMutipleColumnsGivenArray([[ea, eb]]);
		}) || [];
		whatToShowLastUsed = showRootTypes;
	};

	const showQueries = () => {
		if (queries) {
			baseDataToShow = queries?.sort((a: any, b: any) => {
				let ea = a.dd_rootName;
				let eb = b.dd_rootName;
				let ga = a.dd_displayName;
				let gb = b.dd_displayName;
				return sortingFunctionMutipleColumnsGivenArray([
					[ea, eb],
					[ga, gb]
				]);
			}) || [];
		} else {
			baseDataToShow = [];
		}
		whatToShowLastUsed = showQueries;
	};

	const showMutations = () => {
		if (mutations) {
			baseDataToShow = mutations?.sort((a: any, b: any) => {
				let ea = a.dd_rootName;
				let eb = b.dd_rootName;
				let fa = a.dd_displayName.substring(6);
				let fb = b.dd_displayName.substring(6);
				let ga = a.dd_displayName;
				let gb = b.dd_displayName;
				return sortingFunctionMutipleColumnsGivenArray([
					[ea, eb],
					[fa, fb],
					[ga, gb]
				]);
			}) || [];
		} else {
			baseDataToShow = [];
		}
		whatToShowLastUsed = showMutations;
	};

	const showAll = () => {
		if (mutations) {
			baseDataToShow = [...rootTypes, ...queries, ...mutations]?.sort((a: any, b: any) => {
				let ea = a.dd_rootName;
				let eb = b.dd_rootName;
				let fa = a.dd_displayName.substring(6);
				let fb = b.dd_displayName.substring(6);
				let ga = a.dd_displayName;
				let gb = b.dd_displayName;
				return sortingFunctionMutipleColumnsGivenArray([
					[ea, eb],
					[fa, fb],
					[ga, gb]
				]);
			}) || [];
		} else {
			baseDataToShow = [];
		}
		whatToShowLastUsed = showAll;
	};
	const showQueriesAndMutations = () => {
		if (mutations) {
			baseDataToShow = [...queries, ...mutations]?.sort((a: any, b: any) => {
				let ea = a.dd_rootName;
				let eb = b.dd_rootName;
				let fa = a.dd_displayName.substring(6);
				let fb = b.dd_displayName.substring(6);
				let ga = a.dd_displayName;
				let gb = b.dd_displayName;
				return sortingFunctionMutipleColumnsGivenArray([
					[ea, eb],
					[fa, fb],
					[ga, gb]
				]);
			}) || [];
		} else {
			baseDataToShow = [];
		}
		whatToShowLastUsed = showQueriesAndMutations;
	};

	let columns = $state<any[]>([]);

	$effect(() => {
		if (whatToShow.length > 0) {
			columns = [
				{
					accessorFn: (row: any) => row.dd_displayName,
					header: 'Name',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => row.dd_rootName,
					header: 'Root',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => (row.dd_kindList_NON_NULL ? '!' : ''),
					header: 'L',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => (row.dd_kindList ? 'list' : ''),
					header: 'List',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => (row.dd_kindEl_NON_NULL ? '!' : ''),
					header: 'E',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => row.dd_kindEl,
					header: 'Kind',
					enableHiding: true
				},

				{
					accessorFn: (row: any) =>
						row.args
							?.map(
								(arg: any) =>
									`${arg.dd_displayName} (${arg.dd_kindList ? 'list of ' : ''}${arg.dd_kindEl})`
							)
							.join('; '),
					header: 'Arguments',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => row.description?.replaceAll(',', ';'),
					header: 'Description',
					enableHiding: true
				},
				{
					accessorFn: (row: any) => row?.tableBaseName,
					header: 'Table Base',
					enableHiding: true
				}
			];
		}
	});
	let showExplorer = $state(false);
	let showTable = $state(false);
	const toggleExplorer = () => {
		showExplorer = !showExplorer;
	};
	const toggleTable = () => {
		showTable = !showTable;
	};
	let csvData = $state<string>('');
	let selectedRowsOriginal = $state<any[]>([]);

	let showEditModal = $state(false);
	let editModalInitialValue = $state('');

	const handleEdit = () => {
		if (!selectedRowsOriginal || selectedRowsOriginal.length === 0) {
			addToast('No rows selected', 'warning');
			return;
		}

		if (selectedRowsOriginal.length === 1) {
			editModalInitialValue = selectedRowsOriginal[0].tableBaseName || '';
		} else {
			editModalInitialValue = 'tableName';
		}
		showEditModal = true;
	};

	const confirmEdit = (newValue: string) => {
		selectedRowsOriginal.forEach((row) => {
			row.tableBaseName = newValue;
		});
		whatToShow = [...whatToShow];
	};
</script>

<Page MenuItem={true}>
	<section class="ml-4 h-screen w-screen overflow-auto pb-20 pr-8">
		<div class="sticky top-0 z-20 mb-6 space-y-4 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur">
			<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
				<div class="flex w-full items-center gap-2 md:max-w-md">
					<div class="relative flex-1">
						<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							class="pl-9 h-9"
							placeholder="Filter (e.g. +user -id)"
							bind:value={sortingInputValue}
						/>
					</div>
					<Button
						size="icon"
						variant={caseSensitive ? 'default' : 'outline'}
						class="h-9 w-9"
						onclick={() => (caseSensitive = !caseSensitive)}
						title="Case Sensitive"
					>
						<CaseSensitive class="h-5 w-5" />
					</Button>
				</div>

				<div class="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
					<Button
						variant={showExplorer ? 'secondary' : 'ghost'}
						size="sm"
						class="h-7 px-3 gap-2"
						onclick={toggleExplorer}
					>
						<LayoutList class="h-3.5 w-3.5" /> Explorer
					</Button>
					<Button
						variant={showTable ? 'secondary' : 'ghost'}
						size="sm"
						class="h-7 px-3 gap-2"
						onclick={toggleTable}
					>
						<TableIcon class="h-3.5 w-3.5" /> Table
					</Button>
				</div>
			</div>

			<Separator />

			<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
				<div class="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/50 p-1">
					{#each [
						{ label: 'Root', fn: showRootTypes },
						{ label: 'Queries', fn: showQueries },
						{ label: 'Mutations', fn: showMutations },
						{ label: 'Q&M', fn: showQueriesAndMutations },
						{ label: 'All', fn: showAll }
					] as opt}
						<Button
							variant={whatToShowLastUsed === opt.fn ? 'secondary' : 'ghost'}
							size="xs"
							class="h-7 px-3 text-xs"
							onclick={opt.fn}
						>
							{opt.label}
						</Button>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						class="h-9 gap-2"
						onclick={() => navigator.clipboard.writeText(csvData)}
						disabled={!csvData}
					>
						<Clipboard class="h-4 w-4" /> Copy CSV
					</Button>
					<Button variant="outline" size="sm" class="h-9 gap-2" onclick={handleEdit}>
						<Pencil class="h-4 w-4" /> Edit
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="h-9 w-9"
						onclick={() => {
							baseDataToShow = [...baseDataToShow];
							showTable = false;
							setTimeout(() => {
								showTable = true;
							}, 100);
						}}
						title="Rerender Table"
					>
						<RefreshCw class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>

		<div class="rounded-xl border bg-card">
			{#if showTable && whatToShow.length > 0}
				<ExplorerTable
					data={whatToShow}
					{columns}
					onRowSelectionChange={(detail: any) => {
						selectedRowsOriginal = detail.rows.map((row: any) => row.original);
						let columnNames: string[] = [];
						let rowsData: string[];
						rowsData = detail.rows.map((row: any, i: number) => {
							return row
								.getVisibleCells()
								.map((cell: any) => {
									if (i == 0) {
										columnNames.push(cell.column.id);
									}
									return cell.getValue();
								})
								.join(`,`);
						});
						csvData = `${columnNames.join(',')}\n${rowsData.join('\n')}`;
					}}
				/>
			{/if}

			{#if showExplorer}
				<div class="pointer-events-none p-6 space-y-2">
					{#key whatToShow}
						{#each whatToShow as type, index (index)}
							<div class="pointer-events-none rounded-lg border bg-muted/30 p-2 transition-colors hover:bg-muted/50">
								<Type {index} {type} template="default" depth={0} />
							</div>
						{/each}
					{/key}
				</div>
			{/if}

			{#if whatToShow.length === 0}
				<div class="flex flex-col items-center justify-center p-20 text-muted-foreground">
					<ListFilter class="h-12 w-12 opacity-20 mb-4" />
					<p class="text-lg font-medium opacity-50">Select a scope to start exploring</p>
				</div>
			{/if}
		</div>
	</section>

	<EditTableBaseNameModal
		bind:show={showEditModal}
		initialValue={editModalInitialValue}
		onConfirm={(val) => {
			confirmEdit(val);
			baseDataToShow = [...baseDataToShow];
		}}
		onCancel={() => (showEditModal = false)}
	/>
</Page>
