<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.ts";
	import Page from '$lib/components/Page.svelte';

	let { title, sidebar, main } = $props();
</script>

<Sidebar.Provider>
	{@render sidebar?.()}
	<Sidebar.Inset class="flex flex-col flex-1">
		<header class="flex h-16 shrink-0 items-center gap-2 border-b bg-base-300 px-4">
			<Sidebar.Trigger class="-ml-1" />
			<div class="mx-2 flex-1 px-2 font-semibold text-lg">{title}</div>
			<div class="flex items-center gap-2">
				<button class="btn btn-sm btn-ghost" aria-label="Add">
					<i class="bi bi-plus-square text-xl"></i>
				</button>
			</div>
		</header>
		<div class="flex flex-1 flex-col overflow-hidden">
			{@render main?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
