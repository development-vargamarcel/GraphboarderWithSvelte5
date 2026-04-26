<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.ts';

	interface Props {
		show: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { show = $bindable(), onConfirm, onCancel }: Props = $props();
</script>

<Modal bind:show {onCancel}>
	<div class="p-4">
		<h2 class="text-lg font-bold">Are you sure?</h2>
		<p class="py-4 text-muted-foreground">This action cannot be undone.</p>
		<div class="flex justify-end gap-2 mt-4">
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button variant="destructive" onclick={onConfirm}>Confirm</Button>
		</div>
	</div>
</Modal>
