<script lang="ts">
	import { page } from '$app/stores';
	import TabItem from '$lib/components/TabItem.svelte';
	import { getQMSLinks } from '$lib/utils/usefulFunctions';
	import { getContext, onMount } from 'svelte';
	import { recentQueries } from '$lib/stores/recentQueriesStore';
	import { favoriteQueries } from '$lib/stores/favoriteQueriesStore';
	import { historyQueries } from '$lib/stores/historyQueriesStore';
	import type { QMSMainWraperContext } from '$lib/types';
	import Fuse from 'fuse.js';

	interface LinkItem {
		title: string;
		url: string;
	}

	interface Link {
		title: string;
		url: string;
		urlIsRoute: boolean;
		icon: string;
		isSelected: boolean;
		hasFill: boolean;
		items: LinkItem[];
		target?: string;
	}

	interface Props {
		endpointInfo: any;
		onHideSidebar?: () => void;
		prefix?: string;
	}

	let { endpointInfo, onHideSidebar, prefix = '' }: Props = $props();

	let QMSContext = getContext<QMSMainWraperContext>(`${prefix}QMSMainWraperContext`);
	const schemaData = QMSContext?.schemaData;
	let endpointid = $derived($page.params.endpointid);

	let links = $derived<Link[]>([
		{
			title: 'Home',
			url: '/',
			urlIsRoute: true,
			icon: 'bi-house',
			isSelected: false,
			hasFill: true,
			items: []
		},
		{
			title: 'Queries',
			url: `/endpoints/${endpointid}/queries`,
			urlIsRoute: false,
			icon: 'bi bi-asterisk',
			isSelected: false,
			hasFill: false,
			items: getQMSLinks('query', `/endpoints/${endpointid}/queries`, endpointInfo, schemaData)
		},
		{
			title: 'Recent',
			url: `/endpoints/${endpointid}/recent`,
			urlIsRoute: false,
			icon: 'bi bi-clock-history',
			isSelected: false,
			hasFill: false,
			items: $recentQueries
				.filter((q) => q.endpointId === endpointid)
				.map((q) => ({
					title: q.name,
					url: `/endpoints/${endpointid}/${q.type == 'query' ? 'queries' : 'mutations'}/${q.name}`
				}))
		},
		{
			title: 'History',
			url: `/endpoints/${endpointid}/history`,
			urlIsRoute: false,
			icon: 'bi bi-clock',
			isSelected: false,
			hasFill: false,
			items: $historyQueries
				.filter((q) => q.endpointId === endpointid)
				.sort((a, b) => b.timestamp - a.timestamp)
				.map((q) => ({
					title: `${new Date(q.timestamp).toLocaleTimeString()} - ${q.queryName} (${q.status})`,
					url: `/endpoints/${endpointid}/${q.type == 'query' ? 'queries' : 'mutations'}/${q.queryName}?historyId=${q.id}`
				}))
		},
		{
			title: 'Favorites',
			url: `/endpoints/${endpointid}/favorites`,
			urlIsRoute: false,
			icon: 'bi bi-star',
			isSelected: false,
			hasFill: false,
			items: $favoriteQueries
				.filter((q) => q.endpointId === endpointid)
				.map((q) => ({
					title: q.name,
					url: `/endpoints/${endpointid}/${q.type == 'query' ? 'queries' : 'mutations'}/${q.name}`
				}))
		},
		{
			title: 'Mutations',
			url: `/endpoints/${endpointid}/mutations`,
			urlIsRoute: false,
			icon: 'bi bi-pen',
			isSelected: false,
			hasFill: true,
			items: getQMSLinks('mutation', `/endpoints/${endpointid}/mutations`, endpointInfo, schemaData)
		},
		{
			title: 'Explorer',
			url: `/endpoints/${endpointid}/explorer`,
			urlIsRoute: false,
			icon: 'bi bi-compass',
			isSelected: false,
			hasFill: true,
			items: []
		}
	]);

	let searchTerm = $state('');

	let currentLink = $derived(
		links.find((link) => {
			return $page.url.pathname == link.url || $page.url.pathname.startsWith(`${link.url}/`);
		})
	);

	let rawItems = $derived(currentLink?.items ?? []);

	let fuse = $derived(
		new Fuse(rawItems, {
			keys: ['title'],
			threshold: 0.4
		})
	);

	let itemsToShow = $derived.by(() => {
		if (!searchTerm.trim()) return rawItems;
		return fuse.search(searchTerm).map((result) => result.item);
	});

	// Better strategy for reset: track the last visited "tab" URL base
	let lastTabUrl = $state('');
	$effect(() => {
		if (currentLink && currentLink.url !== lastTabUrl) {
			searchTerm = '';
			lastTabUrl = currentLink.url;
		}
	});

	let isHistoryTab = $derived($page.url.pathname.includes('/history'));

	/**
	 * Clears the query history after user confirmation.
	 */
	const clearHistory = () => {
		if (confirm('Are you sure you want to clear all history?')) {
			historyQueries.clear();
		}
	};
</script>

<div class="flex h-screen overscroll-contain">
	<div class="w-16">
		<div class="h-[50px] bg-primary">
			<a href="/" class="block h-full w-full">
				<img src="/logo.svg" alt="GraphQL Explorer Logo" class="h-full w-full" />
			</a>
		</div>
		<ul
			class="w-16xxx border-opacity-5 flex h-full flex-col justify-start overscroll-contain border-t-[1px] border-base-content bg-base-300 pt-1 pb-[25vh]"
		>
			{#each links as link}
				<TabItem
					title={link.title}
					url={link.url}
					icon={link.icon}
					hasFill={link.hasFill}
					urlIsRoute={link.urlIsRoute}
					target={link.target}
				/>
			{/each}
		</ul>
	</div>

	{#if rawItems.length > 0}
		<div class="">
			<div class="flex h-[50px] items-center justify-between gap-2 bg-accent px-4">
				<div class="relative w-full max-w-xs">
					<input
						type="text"
						placeholder="Search..."
						class="input input-xs input-bordered w-full pr-8 text-black"
						bind:value={searchTerm}
					/>
					{#if searchTerm}
						<button
							class="absolute top-0 right-0 bottom-0 z-10 flex items-center pr-2 text-gray-500 hover:text-black"
							onclick={() => (searchTerm = '')}
							aria-label="Clear search"
						>
							<i class="bi bi-x-circle-fill"></i>
						</button>
					{/if}
				</div>

				{#if isHistoryTab}
					<button
						class="btn text-white btn-xs btn-error"
						onclick={clearHistory}
						title="Clear all history"
					>
						<i class="bi bi-trash"></i>
					</button>
				{/if}
			</div>
			<ul
				class="h-full w-[60vw] grow space-y-1 overflow-x-auto overflow-y-auto overscroll-contain bg-base-100 px-4 py-4 pb-[25vh] md:w-full"
			>
				{#each itemsToShow as item}
					<li class="md:w-[10vw] md:min-w-[170px]">
						<a
							href={item.url}
							class="break-allxxx block h-full w-full truncate rounded px-2 py-2 text-sm leading-tight text-base-content hover:bg-info/50 ... {$page
								.url.pathname == item.url || $page.url.pathname.startsWith(`${item.url}/`)
								? 'bg-info/50 font-bold '
								: 'bg-info/5'}"
							title={item.title}
							onclick={() => {
								onHideSidebar?.();
							}}>{item.title}</a
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		type="button"
		aria-label="Close sidebar"
		class="h-screen w-[100vw] cursor-default appearance-none border-none bg-transparent md:hidden"
		onclick={() => {
			onHideSidebar?.();
		}}
	></button>
</div>
