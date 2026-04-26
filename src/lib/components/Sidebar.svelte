<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.ts";
	import * as Tooltip from "$lib/components/ui/tooltip/index.ts";
	import TabContainer from '$lib/components/TabContainer.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import LocalStorageManager from '$lib/components/LocalStorageManager.svelte';
	import ProxySettings from '$lib/components/ProxySettings.svelte';
	import { getContext } from 'svelte';
	import type { QMSMainWraperContext } from '$lib/types';
	import { downloadJSON } from '$lib/utils/usefulFunctions';
	import { proxySettings } from '$lib/stores/proxySettingsStore';
	import { addToast } from '$lib/stores/toastStore';

	interface Props {
		prefix?: string;
	}

	let {
		prefix = ''
	}: Props = $props();

	let QMSContext = getContext<QMSMainWraperContext>(`${prefix}QMSMainWraperContext`);
	const endpointInfo = QMSContext?.endpointInfo;
	const schemaData = QMSContext?.schemaData;

	let showStorageManager = $state(false);
	let showProxySettings = $state(false);

	const downloadSchema = () => {
		if (schemaData && $schemaData.isReady && $schemaData.schema) {
			downloadJSON($schemaData.schema, 'schema.json');
		} else {
			addToast('Schema data is not ready or missing.', 'warning');
		}
	};

	const copySchema = async () => {
		if (schemaData && $schemaData.isReady && $schemaData.schema) {
			await navigator.clipboard.writeText(JSON.stringify($schemaData.schema, null, 2));
			addToast('Introspection schema copied to clipboard!', 'success');
		} else {
			addToast('Schema is not ready yet.', 'warning');
		}
	};
</script>

<LocalStorageManager bind:show={showStorageManager} />
<ProxySettings bind:show={showProxySettings} />

<Sidebar.Root>
	<Sidebar.Content>
		<TabContainer {endpointInfo} />
	</Sidebar.Content>
	<Sidebar.Footer class="p-2">
		<div class="flex items-center gap-2">
			<ThemeToggle />
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="icon-sm"
								onclick={downloadSchema}
								aria-label="Download Schema"
							>
								<i class="bi bi-download"></i>
							</Sidebar.MenuButton>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right">Download Schema</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="icon-sm"
								onclick={copySchema}
								aria-label="Copy Schema JSON"
							>
								<i class="bi bi-clipboard-data"></i>
							</Sidebar.MenuButton>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right">Copy Schema JSON</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="icon-sm"
								onclick={() => (showStorageManager = true)}
								aria-label="Storage Manager"
							>
								<i class="bi bi-database"></i>
							</Sidebar.MenuButton>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right">Storage Manager</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="icon-sm"
								isActive={$proxySettings.enabled}
								onclick={() => (showProxySettings = true)}
								aria-label="Proxy Settings"
							>
								<i class="bi bi-router"></i>
							</Sidebar.MenuButton>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right">Proxy Settings</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>
