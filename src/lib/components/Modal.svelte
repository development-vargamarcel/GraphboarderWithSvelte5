<script lang="ts">
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

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (show && dialog && !dialog.open) {
			dialog.showModal();
		} else if (!show && dialog && dialog.open) {
			dialog.close();
		}
	});

	$effect(() => {
		return () => {
			if (dialog && dialog.open) {
				dialog.close();
			}
		};
	});

	function close(e?: Event) {
		if (e) e.stopPropagation();
		if (!show) return;
		show = false;
		if (onCancel) {
			onCancel({ modalIdentifier });
		}
	}

	function apply(e: Event) {
		e.stopPropagation();
		if (onApply) {
			onApply({ modalIdentifier });
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	class="modal"
	data-modal-identifier={modalIdentifier}
	onclose={close}
	oncancel={close}
>
	<div class="modal-box" onclick={(e) => e.stopPropagation()}>
		<button
			class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
			onclick={close}
			aria-label="Close">✕</button
		>
		{@render children?.()}

		{#if (showApplyBtn && onApply) || onApply}
			<div class="modal-action">
				<button class="btn btn-primary" onclick={apply}>Apply</button>
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={close}>close</button>
	</form>
</dialog>
