<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { showTabs } from '$lib/stores/showTabs';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, LogOut, Home } from 'lucide-svelte';

	interface Props {
		backPath?: any;
		CustomId?: string;
		MenuItem?: any;
		RememberScroll?: boolean;
		title?: any;
		children?: import('svelte').Snippet;
	}

	let {
		backPath,
		CustomId = 'page',
		MenuItem,
		RememberScroll = false,
		title,
		children
	}: Props = $props();

	let hasPreviousPage = $state(false);
	if (browser) {
		hasPreviousPage = window.history.length == 1 ? false : true;
	}

	let backButtonClick = () => {
		if (browser) {
			if (hasPreviousPage) {
				window.history.back();
			} else {
				let path = backPath ? backPath : '/';
				goto(`${path}`, { replaceState: true });
			}
		}
	};

	onDestroy(() => {
		if (browser) {
			if (!MenuItem) {
				showTabs.set(true);
			}
			if (RememberScroll) {
				let mainEl = document.getElementById(CustomId);
				if (mainEl) {
					localStorage.setItem(CustomId, mainEl.scrollTop.toString());
				}
			}
		}
	});
	onMount(() => {
		if (!MenuItem) {
			showTabs.set(false);
		}
		if (RememberScroll) {
			let mainEl = document.getElementById(CustomId);
			if (mainEl) {
				let lastScroll = localStorage.getItem(CustomId);
				if (lastScroll) {
					mainEl.scrollTop = parseInt(lastScroll, 10);
				}
			}
		}
	});
</script>

{#if MenuItem}
	<main
		in:fade|global={{ duration: 350, delay: 200 }}
		out:fade|global={{ duration: 200 }}
		id={CustomId}
		class=" overflow-y-scrollxxx z-0 h-screen w-full overflow-hidden"
	>
		{@render children?.()}
	</main>
{:else}
	<main
		in:scale|global={{ duration: 300, opacity: 1, start: 0.97 }}
		out:scale|global={{ duration: 300, opacity: 0, start: 0.97 }}
		id={CustomId}
		class="  fixed top-0 z-40 h-full w-full overflow-y-scroll bg-background pb-96"
	>
		<header class="sticky top-0 z-50 mb-2 flex h-14 w-full items-center border-b bg-background/95 px-4 backdrop-blur shadow-sm">
			<div class="flex items-center gap-4">
				<Button variant="ghost" size="icon" onclick={backButtonClick} aria-label="Go Back">
					{#if hasPreviousPage}
						<ChevronLeft class="h-6 w-6 text-success" />
					{:else if backPath}
						<LogOut class="h-6 w-6 text-success" />
					{:else}
						<Home class="h-6 w-6 text-success" />
					{/if}
				</Button>
				<h1 class="text-lg font-bold tracking-tight"> {title} </h1>
			</div>
		</header>
		<div class="w-full p-2 md:w-[70vw]">
			{@render children?.()}
		</div>
	</main>
{/if}
