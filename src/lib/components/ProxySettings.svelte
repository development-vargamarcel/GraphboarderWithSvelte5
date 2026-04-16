<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { proxySettings } from '$lib/stores/proxySettingsStore';

	interface Props {
		show?: boolean;
	}

	let { show = $bindable(false) }: Props = $props();

	let tempEnabled = $state($proxySettings.enabled);
	let tempUrl = $state($proxySettings.proxyUrl);

	$effect(() => {
		if (show) {
			tempEnabled = $proxySettings.enabled;
			tempUrl = $proxySettings.proxyUrl;
		}
	});

	const handleSave = () => {
		proxySettings.set({ enabled: tempEnabled, proxyUrl: tempUrl || '/api/proxy' });
		show = false;
	};
</script>

<Modal bind:show modalIdentifier="proxy-settings-modal" showApplyBtn={false}>
	<h3 class="mb-4 text-lg font-bold">Proxy Settings</h3>
	<p class="mb-4 text-sm text-base-content/70">
		Route all GraphQL requests through a proxy server instead of sending them directly from the
		browser. Use the built-in proxy (<code>/api/proxy</code>) to bypass CORS restrictions, or
		specify an external proxy URL.
	</p>

	<div class="form-control mb-4">
		<label class="label cursor-pointer justify-start gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				bind:checked={tempEnabled}
			/>
			<span class="label-text font-medium">Enable proxy</span>
		</label>
	</div>

	<div class="form-control mb-6 w-full" class:opacity-50={!tempEnabled}>
		<label class="label" for="proxy-url">
			<span class="label-text">Proxy URL</span>
		</label>
		<input
			type="text"
			id="proxy-url"
			bind:value={tempUrl}
			disabled={!tempEnabled}
			placeholder="/api/proxy"
			class="input-bordered input w-full font-mono text-sm"
		/>
		<div class="label">
			<span class="label-text-alt text-base-content/60">
				Default: <code>/api/proxy</code> (built-in). For external proxies use a full URL, e.g.
				<code>https://proxy.example.com/forward</code>. The target endpoint URL is appended as
				<code>?target=&lt;url&gt;</code>.
			</span>
		</div>
	</div>

	<div class="flex justify-end gap-2">
		<button class="btn btn-ghost" onclick={() => (show = false)}>Cancel</button>
		<button class="btn btn-primary" onclick={handleSave}>Save</button>
	</div>
</Modal>
