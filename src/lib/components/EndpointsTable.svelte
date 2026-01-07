<script>
	import ExplorerTable from '$lib/components/ExplorerTable.svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	export let data;
	export let columns;
	export let onRowClicked;
	export let onDeleteRow = () => {};
	export let onDuplicateRow = () => {};
</script>

<div class="mx-auto pl-4 pt-4 h-[50vh]">
	<ExplorerTable
		{data}
		{columns}
		{onRowClicked}
		{onDeleteRow}
		{onDuplicateRow}
		enableMultiRowSelectionState={false}
		onRowSelectionChange={() => {}}
	/>
</div>
