<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';

	let showOuter = $state(false);
	let showInner = $state(false);
</script>

<div class="p-8">
	<button class="btn btn-primary" onclick={() => (showOuter = true)}>Open Outer Modal</button>

	{#if showOuter}
		<Modal bind:show={showOuter} modalIdentifier="outer">
			<h2 class="text-xl font-bold">Outer Modal</h2>
			<p>Click the button below to open an inner modal.</p>
			<button class="btn btn-secondary mt-4" onclick={() => (showInner = true)}
				>Open Inner Modal</button
			>

			{#if showInner}
				<Modal bind:show={showInner} modalIdentifier="inner">
					<h2 class="text-xl font-bold">Inner Modal</h2>
					<p>This is a nested modal.</p>
				</Modal>
			{/if}
		</Modal>
	{/if}
</div>
