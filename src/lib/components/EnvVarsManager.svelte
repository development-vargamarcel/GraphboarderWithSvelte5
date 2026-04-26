<script lang="ts">
	import { envVars } from '$lib/stores/envVarsStore';
	import { addToast } from '$lib/stores/toastStore';
	import { downloadJSON } from '$lib/utils/downloadUtils';
	import { logger } from '$lib/utils/logger';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import { Download, Upload, Trash2, Plus, Eye, EyeOff } from 'lucide-react-svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let newKey = $state('');
	let newValue = $state('');
	let showValues = $state(false);
	let fileInput: HTMLInputElement;

	const handleAdd = () => {
		if (!newKey.trim() || !newValue.trim()) {
			addToast('Key and Value are required', 'error');
			return;
		}
		// Validate key format (simple alphanumeric + underscore)
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newKey)) {
			addToast('Key must contain only letters, numbers, and underscores', 'error');
			return;
		}

		envVars.setVar(newKey, newValue);
		addToast(`Variable ${newKey} added`, 'success');
		newKey = '';
		newValue = '';
	};

	const handleDelete = (key: string) => {
		if (confirm(`Delete variable ${key}?`)) {
			envVars.removeVar(key);
			addToast(`Variable ${key} deleted`, 'success');
		}
	};

	const handleExport = () => {
		if (Object.keys($envVars).length === 0) {
			addToast('No variables to export', 'info');
			return;
		}
		downloadJSON($envVars, 'env-vars.json');
		addToast('Environment variables exported', 'success');
	};

	const handleImportClick = () => {
		fileInput.click();
	};

	const handleFileChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);

				// Validate structure: Record<string, string>
				if (typeof json !== 'object' || json === null || Array.isArray(json)) {
					throw new Error('Invalid format: Expected a JSON object');
				}

				for (const [key, value] of Object.entries(json)) {
					if (typeof value !== 'string') {
						throw new Error(`Invalid value for key "${key}": Expected string`);
					}
				}

				if (
					confirm(
						`Import ${Object.keys(json).length} variables? Existing variables with same keys will be overwritten.`
					)
				) {
					envVars.importVars(json as Record<string, string>);
					addToast(`Imported ${Object.keys(json).length} variables`, 'success');
				}
			} catch (err: any) {
				logger.error('Failed to import env vars', err);
				addToast(err.message || 'Failed to parse JSON file', 'error');
			}
			// Reset input
			target.value = '';
		};
		reader.readAsText(file);
	};
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-bold">Environment Variables</h3>
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" onclick={handleExport} title="Export Variables">
				<Download class="h-4 w-4" />
			</Button>
			<Button variant="ghost" size="icon" onclick={handleImportClick} title="Import Variables">
				<Upload class="h-4 w-4" />
			</Button>
			<input
				type="file"
				bind:this={fileInput}
				onchange={handleFileChange}
				accept=".json"
				class="hidden"
			/>
			<Separator orientation="vertical" class="h-6" />
			<div class="flex items-center space-x-2">
				<Switch id="show-values" bind:checked={showValues} />
				<Label for="show-values" class="text-xs">Show Values</Label>
			</div>
		</div>
	</div>

	<p class="text-sm text-muted-foreground">
		Variables can be used in headers as <code>{`{{VARIABLE_NAME}}`}</code>. They are stored locally.
	</p>

	<div class="max-h-60 overflow-y-auto rounded-md border">
		{#if Object.keys($envVars).length === 0}
			<div class="p-8 text-center text-sm text-muted-foreground">No variables defined.</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Key</Table.Head>
						<Table.Head>Value</Table.Head>
						<Table.Head class="w-[50px]">Action</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each Object.entries($envVars) as [key, val]}
						<Table.Row>
							<Table.Cell class="font-mono">{key}</Table.Cell>
							<Table.Cell class="font-mono text-sm opacity-70">
								{#if showValues}
									{val}
								{:else}
									••••••••
								{/if}
							</Table.Cell>
							<Table.Cell>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive"
									onclick={() => handleDelete(key)}
									aria-label="Delete {key}"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</div>

	<Separator class="my-2" />

	<div class="flex flex-col gap-3">
		<h4 class="text-sm font-semibold">Add New Variable</h4>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-7">
			<div class="sm:col-span-3">
				<Input
					type="text"
					placeholder="Key (e.g. API_TOKEN)"
					class="font-mono"
					bind:value={newKey}
				/>
			</div>
			<div class="sm:col-span-3">
				<Input
					type={showValues ? 'text' : 'password'}
					placeholder="Value"
					class="font-mono"
					bind:value={newValue}
				/>
			</div>
			<div class="sm:col-span-1">
				<Button class="w-full" onclick={handleAdd}>
					<Plus class="mr-1 h-4 w-4" /> Add
				</Button>
			</div>
		</div>
	</div>

	<div class="mt-4 flex justify-end">
		<Button variant="outline" onclick={onClose}>Close</Button>
	</div>
</div>
