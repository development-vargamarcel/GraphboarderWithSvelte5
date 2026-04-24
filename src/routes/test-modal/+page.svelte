<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';

	let showOuter = $state(false);
	let showInner = $state(false);
</script>

<div class="p-8">
	<button class="btn btn-primary" onclick={() => (showOuter = true)}>Open Outer Modal</button>
</div>

<Modal bind:show={showOuter} modalIdentifier="outer" showApplyBtn={false}>
	<h2 class="mb-4 text-lg font-bold">Outer Modal</h2>
	<button class="btn btn-secondary" onclick={() => (showInner = true)}>Open Inner Modal</button>
</Modal>

<Modal bind:show={showInner} modalIdentifier="inner" showApplyBtn={false}>
	<h2 class="mb-4 text-lg font-bold">Inner Modal</h2>
	<p>Content inside the nested modal.</p>
</Modal>
