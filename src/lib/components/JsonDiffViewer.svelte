<script lang="ts">
	import * as Diff from 'diff';

	/**
	 * Props for JsonDiffViewer
	 */
	interface Props {
		/** The original JSON value (e.g., pinned response). Can be string or object. */
		left: string | object;
		/** The new JSON value (e.g., current response). Can be string or object. */
		right: string | object;
	}

	let { left, right }: Props = $props();

	/**
	 * Computes the diff between two JSON objects using Diff.diffJson.
	 * It safely parses strings to objects to ensure semantic comparison.
	 */
	let diffParts = $derived.by(() => {
		let leftObj = left;
		let rightObj = right;

		try {
			if (typeof left === 'string') {
				leftObj = JSON.parse(left);
			}
		} catch (e) {
			console.error('JsonDiffViewer: Error parsing left value', e);
		}

		try {
			if (typeof right === 'string') {
				rightObj = JSON.parse(right);
			}
		} catch (e) {
			console.error('JsonDiffViewer: Error parsing right value', e);
		}

		// diffJson compares objects semantically
		return Diff.diffJson(leftObj, rightObj);
	});
</script>

<div
	class="max-h-[50vh] overflow-auto rounded-lg bg-base-300 p-4 font-mono text-sm whitespace-pre-wrap"
>
	{#each diffParts as part, i (i)}
		<span
			class={part.added
				? 'bg-success/30 text-success-content'
				: part.removed
					? 'bg-error/30 text-error-content'
					: 'opacity-70'}
		>
			{part.value}
		</span>
	{/each}
</div>
