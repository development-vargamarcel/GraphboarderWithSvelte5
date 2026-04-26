<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.ts';
	import { Input } from '$lib/components/ui/input/index.ts';

	interface Props {
		show: boolean;
		initialValue?: string;
		onConfirm: (newValue: string) => void;
		onCancel: () => void;
	}

	let { show = $bindable(), initialValue = '', onConfirm, onCancel }: Props = $props();

	let value = $state(initialValue);

	$effect(() => {
		if (show) {
			value = initialValue;
		}
	});

	function handleConfirm() {
		onConfirm(value);
		show = false;
	}
</script>

<Modal bind:show {onCancel} modalIdentifier="edit-tablename-modal">
	<div class="p-4">
		<h3 class="mb-4 text-lg font-bold">Edit Table Base Name</h3>
		<Input
			type="text"
			placeholder="Enter table name"
			class="w-full"
			bind:value
			onkeydown={(e) => e.key === 'Enter' && handleConfirm()}
		/>
		<div class="flex justify-end gap-2 mt-4">
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button onclick={handleConfirm}>Save</Button>
		</div>
	</div>
</Modal>
