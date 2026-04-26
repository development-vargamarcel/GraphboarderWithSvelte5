<script lang="ts">
	import { writable } from 'svelte/store';
	import { createSvelteTable, flexRender, getCoreRowModel } from '@tanstack/svelte-table';
	import type { ColumnDef, TableOptions } from '@tanstack/svelte-table';
	import { formatData, getPreciseType, getTableCellData } from '$lib/utils/usefulFunctions';
	import ColumnInfo from './ColumnInfo.svelte';
	import { getContext } from 'svelte';
	import InfiniteLoading from 'svelte-infinite-loading';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { FileJson, FileSpreadsheet, ChevronDown, EyeOff, Info } from 'lucide-svelte';

	interface Props {
		prefix?: string;
		enableMultiRowSelectionState?: boolean;
		enableRowSelectionState?: boolean;
		infiniteHandler: any;
		infiniteId: any;
		data: any[];
		cols?: any[];
		rowSelectionState?: any;
		onRowSelectionChange?: (detail: any) => void;
		onHideColumn?: (detail: { column: string }) => void;
		onRowClicked?: (detail: any) => void;
	}

	let {
		prefix = '',
		enableMultiRowSelectionState = true,
		enableRowSelectionState = true,
		infiniteHandler,
		infiniteId,
		data,
		cols = [],
		rowSelectionState = $bindable(),
		onRowSelectionChange,
		onHideColumn,
		onRowClicked
	}: Props = $props();

	if (rowSelectionState === undefined) {
		rowSelectionState = {};
	}
	let loadMore = $state(false);
	let QMSWraperContext = getContext(`${prefix}QMSWraperContext`) as any;
	let idColName = QMSWraperContext?.idColName;
	const { paginationOptions } = getContext(`${prefix}QMSWraperContext`) as any;

	const getColumnVisibility = (cols: any[]) => {
		let columnVisibility: Record<string, boolean> = {};
		cols.forEach((col) => {
			col.hidden ? (columnVisibility[col.title] = false) : (columnVisibility[col.title] = true);
		});
		return columnVisibility;
	};
	let columnVisibility = getColumnVisibility(cols);
	const getColumns = (cols: any[]) => {
		let columns = cols.map((col) => {
			return {
				...col,
				accessorFn: (row: any, index: number) => getTableCellData(row, col, index),
				header: col.title,
				footer: col.title,
				enableHiding: true
			};
		});
		return columns;
	};

	const setRowSelection = (updater: any) => {
		if (updater instanceof Function) {
			rowSelectionState = updater(rowSelectionState);
		} else {
			rowSelectionState = updater;
		}
		options.update((old) => ({
			...old,
			state: {
				...old.state,
				rowSelection: rowSelectionState
			}
		}));

		onRowSelectionChange?.({ ...$table.getSelectedRowModel() });
	};

	const options = writable<TableOptions<any>>({
		data: data,
		columns: getColumns(cols),
		getCoreRowModel: getCoreRowModel(),
		enableMultiRowSelection: enableMultiRowSelectionState,
		enableRowSelection: enableRowSelectionState,
		onRowSelectionChange: setRowSelection,
		enableHiding: true,
		initialState: { rowSelection: rowSelectionState },
		state: { columnVisibility, rowSelection: rowSelectionState },
		getRowId: (row) => row?.[idColName]
	});

	const table = createSvelteTable(options);

	// Sync data and columns when props change
	$effect(() => {
		options.update((options) => ({
			...options,
			data: data,
			columns: getColumns(cols)
		}));
	});

	const downloadJSON = () => {
		if (!data || data.length === 0) return;
		const jsonString = JSON.stringify(data, null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const downloadCSV = () => {
		if (!data || data.length === 0) return;
		const headers = cols.map((col) => `"${col.title.replace(/"/g, '""')}"`);
		const csvRows = [headers.join(',')];
		for (const row of data) {
			const values = cols.map((col) => {
				const cellData = getTableCellData(row, col, 0);
				let stringValue = '';
				if (cellData === null || cellData === undefined) {
					stringValue = '';
				} else if (typeof cellData === 'object') {
					stringValue = JSON.stringify(cellData);
				} else {
					stringValue = String(cellData);
				}
				const escaped = stringValue.replace(/"/g, '""');
				return `"${escaped}"`;
			});
			csvRows.push(values.join(','));
		}
		const csvString = csvRows.join('\n');
		const blob = new Blob([csvString], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};
</script>

<div class="h-[80vh] overflow-y-auto overscroll-contain rounded-xl border bg-card shadow-sm pb-32">
	{#if data && data.length > 0}
		<div class="sticky top-0 z-30 flex items-center justify-end gap-2 border-b bg-card/95 p-2 backdrop-blur">
			<Button variant="ghost" size="sm" class="gap-2" onclick={downloadCSV}>
				<FileSpreadsheet class="h-4 w-4" /> Export CSV
			</Button>
			<Button variant="ghost" size="sm" class="gap-2" onclick={downloadJSON}>
				<FileJson class="h-4 w-4" /> Export JSON
			</Button>
		</div>
	{/if}

	<Table.Root>
		<Table.Header class="sticky top-[49px] z-20 bg-muted/50">
			{#each $table.getHeaderGroups() as headerGroup}
				<Table.Row>
					{#if enableRowSelectionState}
						<Table.Head class="w-12">
							<Checkbox />
						</Table.Head>
					{/if}
					<Table.Head class="w-12 text-center">#</Table.Head>
					{#each headerGroup.headers as header}
						<Table.Head>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											variant="ghost"
											size="sm"
											class="h-8 gap-2 px-2 hover:bg-muted/80 {idColName == header.column.columnDef.header ? 'underline decoration-dotted' : ''}"
											{...props}
										>
											{#if !header.isPlaceholder}
												{@const SvelteComponent = flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
												<SvelteComponent />
											{/if}
											<ChevronDown class="h-3 w-3 opacity-50" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" class="w-56">
									<DropdownMenu.Label class="flex items-center gap-2">
										<Info class="h-4 w-4" /> Column Details
									</DropdownMenu.Label>
									<div class="p-2 text-xs text-muted-foreground border-b mb-1">
										<ColumnInfo stepsOfFields={(header.column.columnDef as any).stepsOfFields} />
									</div>
									<DropdownMenu.Item onclick={() => onHideColumn?.({ column: header.column.columnDef.header as string })}>
										<EyeOff class="mr-2 h-4 w-4" /> Hide field
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#each $table.getRowModel().rows as row, i (row.id)}
				<Table.Row
					class="cursor-pointer transition-colors hover:bg-muted/30"
					onclick={() => onRowClicked?.(row.original)}
				>
					{#if enableRowSelectionState}
						<Table.Cell onclick={(e) => e.stopPropagation()}>
							<Checkbox
								checked={row.getIsSelected()}
								onCheckedChange={(checked) => {
									const toggleSelectedHandler = row.getToggleSelectedHandler();
									toggleSelectedHandler({ target: { checked } });
								}}
							/>
						</Table.Cell>
					{/if}

					<Table.Cell class="text-center font-mono text-xs text-muted-foreground">
						{row.index + 1}
					</Table.Cell>

					{#each row.getVisibleCells() as cell}
						<Table.Cell class="max-w-md truncate font-mono text-xs" title={cell.renderValue() as string}>
							{formatData(cell.renderValue(), 40, true)}
							{#if getPreciseType(cell.renderValue()) == 'array'}
								{@const val = cell.renderValue() as any[]}
								<Badge variant="outline" class="ml-1 h-4 px-1 text-[10px] font-normal">{val.length}</Badge>
							{/if}
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

	{#if $paginationOptions?.infiniteScroll && !loadMore && data?.length > 0}
		<div class="p-4 flex flex-col items-center gap-4 border-t bg-muted/10">
			<Button class="w-full max-w-sm" onclick={() => (loadMore = true)}>
				Load more
			</Button>
			<p class="text-xs text-muted-foreground text-center">
				Pagination currently optimized for 'limit' over 20 via filters or pagination store.
			</p>
		</div>
	{/if}
	{#if $paginationOptions?.infiniteScroll && data?.length > 0 && loadMore}
		<div class="py-8">
			<InfiniteLoading on:infinite={infiniteHandler} identifier={infiniteId} distance={100} />
		</div>
	{/if}
	<div class="h-4"></div>
</div>
