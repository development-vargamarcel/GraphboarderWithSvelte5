<script lang="ts">
	import { addEndpoint, removeEndpoint } from '$lib/stores/endpointsStore';
	import { localEndpoints } from '$lib/stores/testData/testEndpoints';
	import { addToast } from '$lib/stores/toastStore';
	import type { AvailableEndpoint } from '$lib/types';
	import { getProxiedUrl } from '$lib/stores/proxySettingsStore';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { AlertCircle, Loader2 } from 'lucide-svelte';

	interface Props {
		onEndpointAdded?: () => void;
		onHide?: () => void;
		endpointToEdit?: AvailableEndpoint | null;
		isDuplicate?: boolean;
	}

	let { onEndpointAdded, onHide, endpointToEdit = null, isDuplicate = false }: Props = $props();

	let id = $state('');
	let url = $state('');
	let headers = $state('');

	let idError = $state('');
	let urlError = $state('');
	let headersError = $state('');
	let generalError = $state('');
	let isTestingConnection = $state(false);

	$effect(() => {
		if (endpointToEdit) {
			id = isDuplicate ? `${endpointToEdit.id}_copy` : endpointToEdit.id;
			url = endpointToEdit.url;
			headers = endpointToEdit.headers ? JSON.stringify(endpointToEdit.headers, null, 2) : '';
		}
	});

	const placeholderHeaders = '{"Authorization": "Bearer token"}';

	const validateId = () => {
		idError = '';
		if (!id.trim()) {
			idError = 'ID is required';
			return false;
		}

		if (endpointToEdit && !isDuplicate && id === endpointToEdit.id) {
			return true;
		}

		if (localEndpoints.some((e) => e.id === id)) {
			idError = `Cannot overwrite built-in endpoint '${id}'.`;
			return false;
		}
		return true;
	};

	const validateUrl = () => {
		urlError = '';
		if (!url.trim()) {
			urlError = 'URL is required';
			return false;
		}
		try {
			new URL(url);
			return true;
		} catch {
			urlError = 'Invalid URL format (must start with http:// or https://)';
			return false;
		}
	};

	const validateHeaders = () => {
		headersError = '';
		if (!headers.trim()) return true;
		try {
			JSON.parse(headers);
			return true;
		} catch (e) {
			headersError = 'Invalid JSON format for headers';
			return false;
		}
	};

	const handleSave = () => {
		generalError = '';

		const isIdValid = validateId();
		const isUrlValid = validateUrl();
		const isHeadersValid = validateHeaders();

		if (!isIdValid || !isUrlValid || !isHeadersValid) {
			return;
		}

		try {
			let headersObj = {};
			if (headers.trim()) {
				headersObj = JSON.parse(headers);
			}

			const newEndpoint: AvailableEndpoint = {
				id,
				url,
				headers: headersObj,
				isMaintained: false,
				description: endpointToEdit?.description || 'User added endpoint'
			};

			if (endpointToEdit && !isDuplicate && endpointToEdit.id !== id) {
				removeEndpoint(endpointToEdit.id);
			}

			addEndpoint(newEndpoint);

			const action = endpointToEdit && !isDuplicate ? 'updated' : 'added';
			addToast(`Endpoint ${action} successfully!`, 'success');

			onEndpointAdded?.();
			onHide?.();
		} catch (e: any) {
			generalError = e.message;
			addToast('Failed to save endpoint', 'error');
		}
	};

	const testConnection = async () => {
		if (!validateUrl() || !validateHeaders()) return;

		isTestingConnection = true;
		try {
			let headersObj = {};
			if (headers.trim()) {
				headersObj = JSON.parse(headers);
			}

			const response = await fetch(getProxiedUrl(url), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...headersObj
				},
				body: JSON.stringify({ query: '{ __typename }' })
			});

			if (response.ok) {
				addToast('Connection successful!', 'success');
			} else {
				throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
			}
		} catch (e: any) {
			addToast(`Connection failed: ${e.message}`, 'error');
		} finally {
			isTestingConnection = false;
		}
	};
</script>

<div class="w-full">
	<h2 class="mb-4 text-2xl font-bold tracking-tight">
		{#if isDuplicate}
			Duplicate Endpoint
		{:else}
			{endpointToEdit ? 'Edit Endpoint' : 'Add new Endpoint'}
		{/if}
	</h2>
	<p class="mb-6 text-muted-foreground">
		{endpointToEdit && !isDuplicate
			? 'Update your endpoint configuration'
			: "Save endpoint to your browser's Local Storage"}
	</p>

	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="endpoint-id">ID (Unique Name)</Label>
			<Input
				id="endpoint-id"
				bind:value={id}
				oninput={() => {
					idError = '';
				}}
				onblur={validateId}
				placeholder="my-endpoint"
				class={idError ? "border-destructive focus-visible:ring-destructive" : ""}
			/>
			{#if idError}
				<p class="text-xs font-medium text-destructive">{idError}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="endpoint-url">URL</Label>
			<Input
				id="endpoint-url"
				bind:value={url}
				oninput={() => {
					urlError = '';
				}}
				onblur={validateUrl}
				placeholder="https://example.com/graphql"
				class={urlError ? "border-destructive focus-visible:ring-destructive" : ""}
			/>
			{#if urlError}
				<p class="text-xs font-medium text-destructive">{urlError}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="endpoint-headers">Headers (JSON)</Label>
			<Textarea
				id="endpoint-headers"
				bind:value={headers}
				oninput={() => {
					headersError = '';
				}}
				onblur={validateHeaders}
				class={"h-32 " + (headersError ? "border-destructive focus-visible:ring-destructive" : "")}
				placeholder={placeholderHeaders}
			/>
			{#if headersError}
				<p class="text-xs font-medium text-destructive">{headersError}</p>
			{/if}
		</div>
	</div>

	{#if generalError}
		<div class="mt-4 flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
			<AlertCircle class="h-4 w-4" />
			<span>{generalError}</span>
		</div>
	{/if}

	<div class="mt-8 flex justify-end gap-2">
		<Button
			variant="outline"
			onclick={testConnection}
			disabled={!url || isTestingConnection}
			type="button"
		>
			{#if isTestingConnection}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			Test Connection
		</Button>
		<Button
			variant="ghost"
			onclick={() => {
				onHide?.();
			}}>Cancel</Button
		>
		<Button onclick={handleSave} disabled={!id || !url}>Save</Button>
	</div>
</div>
