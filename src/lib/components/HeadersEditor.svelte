<script lang="ts">
	import type { EndpointInfoStore } from '$lib/types';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { headerPresetsStore, type HeaderPreset } from '$lib/stores/headerPresetsStore';
	import { logger } from '$lib/utils/logger';
	import { v4 as uuid } from '@lukeed/uuid';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { X, AlertCircle } from 'lucide-svelte';

	interface Props {
		endpointInfo: EndpointInfoStore;
		onClose: () => void;
	}

	let { endpointInfo, onClose }: Props = $props();

	let headersString = $state('{}');
	let error = $state<string | null>(null);
	let presetName = $state('');

	onMount(() => {
		const currentHeaders = get(endpointInfo)?.headers || {};
		headersString = JSON.stringify(currentHeaders, null, 2);
	});

	const save = () => {
		try {
			const headers = JSON.parse(headersString);
			endpointInfo.update((info) => ({
				...info,
				headers
			}));
			error = null;
			logger.info('Headers updated manually');
			onClose();
		} catch (e) {
			error = (e as Error).message;
			logger.warn('Failed to parse headers JSON', e);
		}
	};

	const savePreset = () => {
		if (!presetName) return;
		try {
			const headers = JSON.parse(headersString);
			const id = uuid();
			headerPresetsStore.addPreset({
				id,
				name: presetName,
				headers
			});
			logger.info(`Preset saved: ${presetName}`);
			presetName = '';
		} catch (e) {
			error = 'Invalid JSON, cannot save preset.';
			logger.warn('Failed to save preset due to invalid JSON', e);
		}
	};

	const loadPreset = (preset: HeaderPreset) => {
		headersString = JSON.stringify(preset.headers, null, 2);
		logger.info(`Preset loaded: ${preset.name}`);
	};

	const deletePreset = (id: string) => {
		headerPresetsStore.removePreset(id);
	};
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-lg font-bold">Edit Headers</h3>
	<p class="text-sm text-muted-foreground">
		Modify headers for the current session. These headers will be used for all subsequent requests.
	</p>

	<!-- Presets Section -->
	<div class="rounded-md border bg-muted/50 p-4">
		<h4 class="mb-3 text-sm font-semibold">Presets</h4>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each $headerPresetsStore as preset}
				<Badge variant="secondary" class="flex items-center gap-1 px-2 py-1">
					<button class="hover:underline text-xs" onclick={() => loadPreset(preset)}>{preset.name}</button>
					<button
						class="ml-1 rounded-full p-0.5 hover:bg-muted"
						onclick={() => deletePreset(preset.id)}
						aria-label="Delete preset">
						<X class="h-3 w-3" />
					</button>
				</Badge>
			{/each}
			{#if $headerPresetsStore.length === 0}
				<span class="text-xs text-muted-foreground italic">No presets saved.</span>
			{/if}
		</div>
		<div class="flex gap-2">
			<Input
				type="text"
				class="h-9 grow"
				placeholder="New preset name..."
				bind:value={presetName}
			/>
			<Button
				size="sm"
				variant="outline"
				onclick={savePreset}
				disabled={!presetName}
				aria-label="Save Preset">Save Preset</Button
			>
		</div>
	</div>

	<Textarea
		class="h-64 font-mono text-sm"
		bind:value={headersString}
		placeholder={'{ "Authorization": "Bearer ..." }'}
	/>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="flex justify-end gap-2">
		<Button variant="ghost" onclick={onClose}>Cancel</Button>
		<Button onclick={save}>Save Headers</Button>
	</div>
</div>
