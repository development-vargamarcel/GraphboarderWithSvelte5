<script lang="ts">
	let { show, children } = $props();
</script>

{#if show}
	<div class="modal modal-open">
		<div class="modal-box">
			{@render children()}
		</div>
	</div>
{/if}
