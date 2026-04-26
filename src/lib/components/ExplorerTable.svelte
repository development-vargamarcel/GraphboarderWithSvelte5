<script lang="ts">
	import { writable } from 'svelte/store';
	import { createSvelteTable, flexRender, getCoreRowModel } from '@tanstack/svelte-table';
	import type { ColumnDef, TableOptions } from '@tanstack/svelte-table';
	import { formatData, getTableCellData } from '$lib/utils/usefulFunctions';
	import { getColumnVisibility, createTableOptions, getColumnFlags } from '$lib/utils/tableUtils';
	import ColumnInfo from './ColumnInfo.svelte';
	import { getContext } from 'svelte';
	import * as Table from '$lib/components/ui/table';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDown, Files, Trash2 } from 'lucide-react-svelte';

	interface Props {
		prefix?: string;
		enableMultiRowSelectionState?: boolean;
		enableRowSelectionState?: boolean;
		infiniteHandler?: any;
		infiniteId?: any;
		data?: any;
		columns?: any;
		rowSelectionState?: any;
		idColName?: any;
		requiredColNames?: any;
		onRowSelectionChange?: (detail: any) => void;
		onHideColumn?: (detail: { column: string }) => void;
		onRowClicked?: (detail: any) => void;
		onDeleteRow?: (detail: any) => void;
		onDuplicateRow?: (detail: any) => void;
	}

	let {
		prefix = '',
		enableMultiRowSelectionState = true,
		enableRowSelectionState = true,
		infiniteHandler,
		infiniteId,
		data = [],
		columns = [],
		rowSelectionState = $bindable(),
		idColName,
		requiredColNames,
		onRowSelectionChange,
		onHideColumn,
		onRowClicked,
		onDeleteRow,
		onDuplicateRow
	}: Props = $props();

	if (rowSelectionState === undefined) {
		rowSelectionState = {};
	}

	let columnVisibility = getColumnVisibility(columns);

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

		onRowSelectionChange?.({ ...$table.getSelectedRowModel(), rowSelectionState });
	};

	const optionsObj = createTableOptions(
		data,
		columns,
		rowSelectionState,
		columnVisibility,
		enableMultiRowSelectionState,
		enableRowSelectionState,
		getCoreRowModel,
		setRowSelection,
		idColName
	);

	const options = writable(optionsObj);

	const rerender = () => {
		options.update((options) => ({
			...options,
			data: data
		}));
	};
	const table = createSvelteTable(options);
	$effect(() => {
		if (data) {
			rerender();
		}
	});
</script>

<div class="h-min max-h-[70vh] min-h-min w-[90vw] max-w-full overflow-auto rounded-md border">
	<Table.Root>
		<Table.Header class="sticky top-0 z-20 bg-muted/50 backdrop-blur">
			{#each $table.getHeaderGroups() as headerGroup}
				<Table.Row>
					{#if enableRowSelectionState}
						<Table.Head class="w-[50px]">
							{#if enableMultiRowSelectionState}
								<Checkbox
									checked={$table.getIsAllRowsSelected()}
									onCheckedChange={() => $table.toggleAllRowsSelected()}
									aria-label="Select all"
								/>
							{/if}
						</Table.Head>
					{/if}
					<Table.Head class="w-[50px]">#</Table.Head>
					{#each headerGroup.headers as header}
						{@const columnFlags = getColumnFlags(
							header.column.columnDef.header as string,
							idColName,
							requiredColNames
						)}
						<Table.Head>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											variant="ghost"
											size="sm"
											class="-ml-3 h-8 data-[state=open]:bg-accent"
											{...props}
										>
											<span
												class="{columnFlags.isIdColumn
													? 'font-black text-primary underline decoration-dotted'
													: ''} {columnFlags.isRequired ? 'font-black text-primary' : ''}"
											>
												{#if !header.isPlaceholder}
													{@const SvelteComponent = flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
													<SvelteComponent />
												{/if}
											</span>
											<ChevronDown class="ml-2 h-4 w-4" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start">
									<DropdownMenu.Item
										onclick={() => {
											onHideColumn?.({ column: header.column.columnDef.header as string });
										}}
									>
										Hide field
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Head>
					{/each}
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#each $table.getRowModel().rows as row (row.id)}
				<Table.Row
					class="cursor-pointer hover:bg-muted/50"
					onclick={() => {
						onRowClicked?.(row.original);
					}}
				>
					{#if enableRowSelectionState}
						<Table.Cell onclick={(e) => e.stopPropagation()}>
							{#if row.getCanMultiSelect()}
								<Checkbox
									checked={row.getIsSelected()}
									onCheckedChange={(val) => row.toggleSelected(!!val)}
									aria-label="Select row"
								/>
							{:else}
								<RadioGroup value={row.getIsSelected() ? 'selected' : ''}>
									<RadioGroupItem
										value="selected"
										onclick={() => row.toggleSelected(true)}
										aria-label="Select row"
									/>
								</RadioGroup>
							{/if}
						</Table.Cell>
					{/if}

					<Table.Cell>{row.index + 1}</Table.Cell>

					{#each row.getVisibleCells() as cell}
						<Table.Cell class="whitespace-nowrap">
							{cell.renderValue()}
						</Table.Cell>
					{/each}

					<Table.Cell class="text-right">
						<div class="flex justify-end gap-2" onclick={(e) => e.stopPropagation()}>
							{#if onDuplicateRow}
								<Button
									variant="ghost"
									size="icon"
									onclick={() => onDuplicateRow(row.original)}
									title="Duplicate"
								>
									<Files class="h-4 w-4" />
								</Button>
							{/if}
							{#if onDeleteRow}
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive"
									onclick={() => onDeleteRow(row.original)}
									title="Delete"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
