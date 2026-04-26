<script lang="ts">
	import CodeEditor from './fields/CodeEditor.svelte';
	import { format } from 'graphql-formatter';
	import hljs from 'highlight.js/lib/core';
	import { onMount, getContext } from 'svelte';
	import graphql from 'highlight.js/lib/languages/graphql';
	import 'highlight.js/styles/base16/solarized-dark.css';
	import { getPreciseType } from '$lib/utils/usefulFunctions';
	import { updateStoresFromAST } from '$lib/utils/astToUIState';
	import { generateTypeScript } from '$lib/utils/graphql/typescript-generator';
	import { calculateComplexity } from '$lib/utils/graphql/complexity';
	import {
		generateCurlCommand,
		generateFetchCommand,
		generateApolloCommand,
		generatePythonCommand,
		generateGoCommand,
		generateRustCommand
	} from '$lib/utils/graphql/codegen';
	import { parse, print } from 'graphql';
	import JSON5 from 'json5';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Modal from '$lib/components/Modal.svelte';
	import { favoriteQueries } from '$lib/stores/favoriteQueriesStore';
	import { addToast } from '$lib/stores/toastStore';
	import { encodeState } from '$lib/utils/stateEncoder';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { downloadText } from '$lib/utils/downloadUtils';
	import { logger } from '$lib/utils/logger';
	import { pinnedResponseStore } from '$lib/stores/pinnedResponseStore';
	import JsonDiffViewer from './JsonDiffViewer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Star, Share2, Code2, Copy, Download, History, Pin, Check, Eye } from 'lucide-svelte';

	/**
	 * Props for GraphqlCodeDisplay component.
	 */
	interface Props {
		/** Whether to show the raw (non-prettified) query body initially. */
		showNonPrettifiedQMSBody?: boolean;
		/** The code value to display (GraphQL query or JSON). */
		value: string;
		/** Whether to enable synchronization from the code editor back to the UI stores. */
		enableSyncToUI?: boolean;
		/** Prefix for context keys. */
		prefix?: string;
		/** The language to display/highlight. Default: 'graphql'. */
		language?: string;
		/** Whether the editor should be read-only. Default: false. */
		readonly?: boolean;
		/** Name of the query, used for pinning responses. */
		queryName?: string;
	}

	let {
		showNonPrettifiedQMSBody = $bindable(false),
		value,
		enableSyncToUI = true,
		prefix = '',
		language = 'graphql',
		readonly = false,
		queryName
	}: Props = $props();

	let valueModifiedManually = $state<string>();
	let lastSyncedValue = $state(value);

	// Favorites State
	let showFavoriteModal = $state(false);
	let favoriteName = $state('');
	let favoriteFolder = $state('');

	let existingFolders = $derived(
		Array.from(new Set($favoriteQueries.map((q) => q.folder).filter(Boolean))).sort()
	);

	// Export Code State
	let showExportModal = $state(false);
	let exportLanguage = $state('curl');
	let exportCopyFeedback = $state(false);

	const exportOptions = [
		{ id: 'curl', label: 'cURL' },
		{ id: 'fetch', label: 'Fetch' },
		{ id: 'ts', label: 'TypeScript' },
		{ id: 'apollo', label: 'Apollo' },
		{ id: 'python', label: 'Python' },
		{ id: 'go', label: 'Go' },
		{ id: 'rust', label: 'Rust' }
	];

	/**
	 * Saves the current query as a favorite.
	 * Checks for a valid name and endpoint ID before saving to the store.
	 */
	const handleSaveFavorite = () => {
		if (!favoriteName.trim()) return;

		const endpointId = $page.params.endpointid;
		if (!endpointId) {
			addToast('Could not determine endpoint ID', 'error');
			return;
		}

		favoriteQueries.add({
			name: favoriteName,
			query: value,
			type: value.trim().startsWith('mutation') ? 'mutation' : 'query',
			endpointId: endpointId,
			folder: favoriteFolder.trim() || undefined
		});

		addToast(`Saved favorite: ${favoriteName}`, 'success');
		showFavoriteModal = false;
		favoriteName = '';
		favoriteFolder = '';
	};

	// Try to get context if available
	let QMSWraperContext: any = $state();
	let QMSMainWraperContext: any = $state();

	try {
		QMSWraperContext = getContext(`${prefix}QMSWraperContext`);
		QMSMainWraperContext = getContext(`${prefix}QMSMainWraperContext`);
	} catch {
		// Context might not be available in all usages
	}

	onMount(() => {
		hljs.registerLanguage('graphql', graphql);
		hljs.highlightAll();
	});

	let astAsString = $state('');
	let ast: any = $state();
	let astPrinted = $state('');
	let complexity = $state(0);
	let copyFeedback = $state(false);
	let shareFeedback = $state(false);
	let downloadFeedback = $state(false);

	let showDiff = $state(false);
	let pinnedResponse = $state<any>(null);

	$effect(() => {
		const unsubscribe = pinnedResponseStore.subscribe((val) => {
			pinnedResponse = val;
		});
		return unsubscribe;
	});

	/**
	 * Copies the raw content string to the clipboard.
	 */
	const copyToClipboard = () => {
		console.debug('Copying content to clipboard');
		navigator.clipboard.writeText(value);
		copyFeedback = true;
		setTimeout(() => {
			copyFeedback = false;
		}, 2000);
	};

	/**
	 * Downloads the current content as a JSON file.
	 */
	const handleDownloadJSON = () => {
		if (!value) return;
		console.debug('Downloading JSON response');
		// Generate filename with timestamp
		const filename = `response-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
		downloadText(value, filename);
		downloadFeedback = true;
		setTimeout(() => {
			downloadFeedback = false;
		}, 2000);
	};

	/**
	 * Generates a shareable URL containing the encoded state and copies it to the clipboard.
	 * Updates the browser's URL without reloading.
	 */
	const handleShare = () => {
		if (!QMSWraperContext) {
			console.warn('Cannot share: QMSWraperContext not available');
			addToast('Cannot share: Context unavailable', 'error');
			return;
		}

		try {
			const { finalGqlArgObj_Store, tableColsData_Store } = QMSWraperContext;
			const args = get(finalGqlArgObj_Store);
			const cols = get(tableColsData_Store);

			const state = { args, cols };
			const encodedState = encodeState(state);

			if (!encodedState) {
				addToast('Failed to encode state', 'error');
				return;
			}

			const url = new URL(window.location.href);
			url.searchParams.set('state', encodedState);

			// Update URL without reloading
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });

			navigator.clipboard.writeText(url.toString());

			shareFeedback = true;
			addToast('Share link copied to clipboard!', 'success');
			setTimeout(() => {
				shareFeedback = false;
			}, 2000);
		} catch (e) {
			console.error('Error sharing link:', e);
			addToast('Error generating share link', 'error');
		}
	};

	/**
	 * Helper function to retrieve the current value of a Svelte store.
	 * @param store The store to get the value from.
	 * @returns The current value of the store.
	 */
	function getStoreValue(store: any) {
		let storeVal;
		store.subscribe(($: any) => (storeVal = $))();
		return storeVal;
	}

	function getEndpointDetails() {
		let url = 'http://localhost:4000/graphql'; // Default fallback
		let headers: Record<string, string> = {};

		if (QMSMainWraperContext) {
			const { endpointInfo } = QMSMainWraperContext;
			// Access store value
			const endpoint = (endpointInfo as any)?.subscribe
				? (getStoreValue(endpointInfo) as any)
				: endpointInfo;
			if (endpoint?.url) {
				url = endpoint.url;
			}
			if (endpoint?.headers) {
				headers = { ...endpoint.headers };
			}
		}

		// Also try localStorage headers if not found in endpoint
		if (Object.keys(headers).length === 0 && browser) {
			const headersStr = localStorage.getItem('headers');
			if (headersStr) {
				try {
					const storedHeaders = JSON.parse(headersStr);
					headers = { ...storedHeaders };
				} catch {
					// ignore
				}
			}
		}
		return { url, headers };
	}

	let exportCode = $derived.by(() => {
		// Dependency on exportLanguage, value, and showExportModal
		// We explicitly access them to ensure reactivity
		const lang = exportLanguage;
		const query = value;
		// Ensure we re-generate when modal opens to capture latest endpoint details
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _ = showExportModal;

		const { url, headers } = getEndpointDetails();

		switch (lang) {
			case 'curl':
				return generateCurlCommand(url, headers, query);
			case 'fetch':
				return generateFetchCommand(url, headers, query);
			case 'ts':
				if (ast && QMSMainWraperContext?.schemaData) {
					try {
						return generateTypeScript(ast, QMSMainWraperContext.schemaData) || '';
					} catch (e: any) {
						return `// Error generating TypeScript: ${e.message}`;
					}
				} else {
					return '// Schema or AST missing for TypeScript generation';
				}
			case 'apollo':
				return generateApolloCommand(query);
			case 'python':
				return generatePythonCommand(url, headers, query);
			case 'go':
				return generateGoCommand(url, headers, query);
			case 'rust':
				return generateRustCommand(url, headers, query);
			default:
				return '';
		}
	});

	const copyExportCode = () => {
		navigator.clipboard.writeText(exportCode);
		exportCopyFeedback = true;
		logger.info('User copied generated code', { language: exportLanguage });
		setTimeout(() => {
			exportCopyFeedback = false;
		}, 2000);
	};

	/**
	 * Synchronizes the parsed AST back to the UI state stores.
	 * This allows the Visual Query Builder to update when the code is manually edited.
	 * @param newAst The parsed GraphQL AST.
	 */
	const syncQueryToUI = (newAst: any) => {
		try {
			if (!QMSWraperContext || !QMSMainWraperContext) {
				console.warn('GraphqlCodeDisplay: Cannot sync to UI - context not available');
				return;
			}

			const { activeArgumentsDataGrouped_Store, tableColsData_Store, paginationState, QMSName } =
				QMSWraperContext;

			const { endpointInfo, schemaData } = QMSMainWraperContext;

			// Get the current QMS info
			const qmsInfo = schemaData.get_QMS_Field(QMSName, 'query', schemaData);

			if (!qmsInfo) {
				console.warn('GraphqlCodeDisplay: QMS info not found');
				return;
			}

			// Update stores from AST
			updateStoresFromAST(
				newAst,
				qmsInfo,
				schemaData,
				endpointInfo,
				activeArgumentsDataGrouped_Store,
				tableColsData_Store,
				paginationState
			);
		} catch (e) {
			console.error('GraphqlCodeDisplay: Error syncing query to UI:', e);
		}
	};

	$effect(() => {
		try {
			// Only parse as GraphQL if language is graphql
			if (value && language === 'graphql') {
				ast = parse(value);
				complexity = calculateComplexity(ast);
			}
		} catch {
			// Failed to parse, ignore
		}
	});

	$effect(() => {
		if (valueModifiedManually && valueModifiedManually !== lastSyncedValue) {
			try {
				if (language === 'graphql') {
					ast = parse(valueModifiedManually);

					// Sync to UI if enabled and context is available
					if (enableSyncToUI && QMSWraperContext && QMSMainWraperContext) {
						syncQueryToUI(ast);
						lastSyncedValue = valueModifiedManually;
					}
				}
			} catch (e) {
				console.error('Error parsing manually modified query:', e);
			}
		}
	});

	$effect(() => {
		if (ast) {
			try {
				astPrinted = print(ast);
			} catch {
				// Failed to print, ignore
			}
		}
	});

	$effect(() => {
		if (ast && getPreciseType(ast) == 'object') {
			astAsString = JSON5.stringify(ast);
		}
	});
</script>

<div class="relative group mx-2 my-2 overflow-hidden rounded-lg border bg-muted/30">
	<div class="max-h-[60vh] overflow-y-auto p-4">
		{#if language === 'json'}
			<div class="mt-2">
				{#if showDiff && pinnedResponse}
					<JsonDiffViewer left={pinnedResponse.response} right={value} />
				{:else}
					<CodeEditor
						rawValue={value}
						language="json"
						{readonly}
						onChanged={(detail) => {
							if (!readonly) valueModifiedManually = detail.chd_rawValue;
						}}
					/>
				{/if}
			</div>
		{:else if showNonPrettifiedQMSBody}
			<div class="space-y-4">
				<div class="rounded bg-background p-4 font-mono text-xs">
					<code>{value}</code>
				</div>
				<div class="rounded bg-background p-4 font-mono text-xs">
					<code>{astAsString}</code>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="rounded bg-background p-4">
					<!-- eslint-disable svelte/no-at-html-tags -->
					<pre class="language-graphql text-sm font-mono leading-relaxed">{@html hljs.highlight(format(value), { language: 'graphql' }).value.trim()}</pre>
					<!-- eslint-enable svelte/no-at-html-tags -->
				</div>
				<div class="mt-2">
					<CodeEditor
						rawValue={value}
						language="graphql"
						{readonly}
						onChanged={(detail) => {
							if (!readonly) valueModifiedManually = detail.chd_rawValue;
						}}
					/>
				</div>
				{#if astPrinted}
					<div class="mt-2">
						<Label class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">AST Printed</Label>
						<CodeEditor rawValue={astPrinted} language="graphql" />
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="absolute top-2 right-2 flex flex-wrap justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
		{#if language === 'graphql'}
			<Badge variant="outline" class="bg-background/80 backdrop-blur-sm shadow-sm h-7">
				Complexity: {complexity}
			</Badge>
			<Button
				variant="outline"
				size="xs"
				class="bg-background/80 backdrop-blur-sm h-7"
				onclick={() => (showFavoriteModal = true)}
				title="Save to favorites"
			>
				<Star class="mr-1.5 h-3.5 w-3.5 fill-yellow-500 text-yellow-500" /> Save
			</Button>
			<Button
				variant="outline"
				size="xs"
				class="bg-background/80 backdrop-blur-sm h-7"
				onclick={handleShare}
				title="Share link"
			>
				{#if shareFeedback}
					<Check class="mr-1.5 h-3.5 w-3.5" /> Copied!
				{:else}
					<Share2 class="mr-1.5 h-3.5 w-3.5" /> Share
				{/if}
			</Button>
			<Button
				variant="outline"
				size="xs"
				class="bg-background/80 backdrop-blur-sm h-7"
				onclick={() => (showExportModal = true)}
				title="Export code"
			>
				<Code2 class="mr-1.5 h-3.5 w-3.5" /> Export
			</Button>
		{/if}
		{#if language === 'json'}
			{#if pinnedResponse}
				<Button
					variant={showDiff ? 'secondary' : 'outline'}
					size="xs"
					class="bg-background/80 backdrop-blur-sm h-7"
					onclick={() => {
						showDiff = !showDiff;
						logger.info('User toggled diff view', { showDiff });
					}}
					title={showDiff ? 'Back to code view' : 'Compare with pinned response'}
				>
					<History class="mr-1.5 h-3.5 w-3.5" />
					{showDiff ? 'Show Code' : 'Diff'}
				</Button>
			{/if}
			<Button
				variant="outline"
				size="xs"
				class="bg-background/80 backdrop-blur-sm h-7"
				onclick={() => {
					pinnedResponseStore.pin(value, queryName || 'Response');
					addToast('Response pinned!', 'success');
				}}
				title="Pin response for comparison"
			>
				<Pin class="mr-1.5 h-3.5 w-3.5" /> Pin
			</Button>
			<Button
				variant="outline"
				size="xs"
				class="bg-background/80 backdrop-blur-sm h-7"
				onclick={handleDownloadJSON}
				title="Download JSON"
			>
				{#if downloadFeedback}
					<Check class="mr-1.5 h-3.5 w-3.5" /> Done
				{:else}
					<Download class="mr-1.5 h-3.5 w-3.5" /> Download
				{/if}
			</Button>
		{/if}
		<Button
			variant="outline"
			size="xs"
			class="bg-background/80 backdrop-blur-sm h-7"
			onclick={copyToClipboard}
			title="Copy to clipboard"
		>
			{#if copyFeedback}
				<Check class="mr-1.5 h-3.5 w-3.5" /> Copied!
			{:else}
				<Copy class="mr-1.5 h-3.5 w-3.5" /> Copy
			{/if}
		</Button>
		{#if language === 'graphql'}
			<Button
				variant="outline"
				size="xs"
				class="bg-background/80 backdrop-blur-sm h-7"
				onclick={() => {
					showNonPrettifiedQMSBody = !showNonPrettifiedQMSBody;
				}}
				title="Toggle view"
			>
				<Eye class="mr-1.5 h-3.5 w-3.5" /> {showNonPrettifiedQMSBody ? 'Prettified' : 'Raw'}</Button
			>
		{/if}
	</div>
</div>

<Modal
	bind:show={showFavoriteModal}
	modalIdentifier="favorite-query-modal"
	onApply={handleSaveFavorite}
	showApplyBtn={true}
>
	<div class="space-y-6 p-2">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500">
				<Star class="h-6 w-6 fill-current" />
			</div>
			<div>
				<h3 class="text-xl font-bold tracking-tight">Save Favorite</h3>
				<p class="text-sm text-muted-foreground">Keep your important queries organized.</p>
			</div>
		</div>

		<div class="grid gap-4">
			<div class="space-y-2">
				<Label for="fav-name">Name</Label>
				<Input
					id="fav-name"
					placeholder="My Awesome Query"
					bind:value={favoriteName}
					onkeydown={(e) => e.key === 'Enter' && handleSaveFavorite()}
				/>
			</div>
			<div class="space-y-2">
				<Label for="fav-folder">Folder (Optional)</Label>
				<Input
					id="fav-folder"
					placeholder="e.g. Auth, Users"
					bind:value={favoriteFolder}
					list="folder-suggestions"
					onkeydown={(e) => e.key === 'Enter' && handleSaveFavorite()}
				/>
				<datalist id="folder-suggestions">
					{#each existingFolders as folder}
						<option value={folder}></option>
					{/each}
				</datalist>
			</div>
		</div>
	</div>
</Modal>

<Modal bind:show={showExportModal} modalIdentifier="export-code-modal" showApplyBtn={false}>
	<div class="space-y-6 p-2">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Code2 class="h-6 w-6" />
			</div>
			<div>
				<h3 class="text-xl font-bold tracking-tight">Export Code</h3>
				<p class="text-sm text-muted-foreground">Generate snippets for your favorite language or client.</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
			{#each exportOptions as option (option.id)}
				<Button
					variant={exportLanguage === option.id ? 'secondary' : 'ghost'}
					size="sm"
					class="flex-1 h-8 rounded-md text-xs shadow-none"
					onclick={() => (exportLanguage = option.id)}
				>
					{option.label}
				</Button>
			{/each}
		</div>

		<div class="relative group/code h-80 overflow-hidden rounded-xl border bg-background shadow-inner">
			<div class="h-full overflow-auto p-4">
				<CodeEditor rawValue={exportCode} language="javascript" readonly={true} />
			</div>
			<Button
				size="sm"
				class="absolute top-3 right-3 shadow-lg"
				onclick={copyExportCode}
			>
				{#if exportCopyFeedback}
					<Check class="mr-1.5 h-4 w-4" /> Copied!
				{:else}
					<Copy class="mr-1.5 h-4 w-4" /> Copy Snippet
				{/if}
			</Button>
		</div>
	</div>
</Modal>
