<script lang="ts">
	import { proxySettings } from '$lib/stores/proxySettingsStore';

	const toggleEnabled = () => {
		proxySettings.update((s) => ({ ...s, enabled: !s.enabled }));
	};

	const updateUrl = (e: Event) => {
		const val = (e.target as HTMLInputElement).value;
		proxySettings.update((s) => ({ ...s, proxyUrl: val || '/api/proxy' }));
	};
</script>

<div class="mb-6 rounded-box bg-base-200 px-4 py-3">
	<div class="flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-3">
			<i
				class="bi bi-router text-lg {$proxySettings.enabled
					? 'text-primary'
					: 'text-base-content/50'}"
			></i>
			<span class="text-sm font-medium">Proxy</span>
			<input
				type="checkbox"
				class="toggle toggle-primary toggle-sm"
				checked={$proxySettings.enabled}
				onchange={toggleEnabled}
			/>
			<span class="text-sm text-base-content/60">
				{$proxySettings.enabled ? 'Enabled' : 'Disabled'}
			</span>
		</div>
		{#if $proxySettings.enabled}
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<label class="shrink-0 text-sm text-base-content/60" for="inline-proxy-url">URL:</label>
				<input
					type="text"
					id="inline-proxy-url"
					value={$proxySettings.proxyUrl}
					onchange={updateUrl}
					placeholder="/api/proxy"
					class="input-bordered input input-sm w-full max-w-sm font-mono text-sm"
				/>
			</div>
		{/if}
	</div>
	{#if $proxySettings.enabled}
		<p class="mt-2 text-xs text-base-content/50">
			Requests are routed through <code class="rounded bg-base-300 px-1"
				>{$proxySettings.proxyUrl}</code
			>. Default <code class="rounded bg-base-300 px-1">/api/proxy</code> bypasses CORS.
		</p>
	{/if}
</div>
