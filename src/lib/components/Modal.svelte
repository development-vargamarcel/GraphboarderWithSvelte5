<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer/index.ts';
	import { Button } from '$lib/components/ui/button/index.ts';

	interface Props {
		show?: boolean;
		children?: import('svelte').Snippet;
		modalIdentifier?: string;
		showApplyBtn?: boolean;
		onCancel?: (detail: any) => void;
		onApply?: (detail: any) => void;
	}

	let {
		show = $bindable(true),
		children,
		modalIdentifier,
		showApplyBtn = true,
		onCancel,
		onApply
	}: Props = $props();

	function close() {
		if (!show) return;
		show = false;
		if (onCancel) {
			onCancel({ modalIdentifier });
		}
	}

	function apply() {
		if (onApply) {
			onApply({ modalIdentifier });
		}
	}
</script>

<Drawer.Root bind:open={show}>
	<Drawer.Content data-modal-identifier={modalIdentifier} class="max-h-[96vh]">
		<div class="mx-auto w-full max-w-5xl overflow-y-auto px-4 pb-8 pt-4">
			<div class="flex justify-end">
				<Button variant="ghost" size="icon" onclick={close} aria-label="Close">
					<i class="bi bi-x-lg"></i>
				</Button>
			</div>

			{@render children?.()}

			{#if (showApplyBtn && onApply) || onApply}
				<div class="mt-4 flex justify-end gap-2">
					<Button onclick={apply}>Apply</Button>
				</div>
			{/if}
		</div>
	</Drawer.Content>
</Drawer.Root>
