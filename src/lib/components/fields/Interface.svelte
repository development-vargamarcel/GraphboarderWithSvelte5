<script lang="ts">
	/**
	 * @component
	 * Interface component for GraphQL arguments.
	 * Provides a text input for entering scalar values.
	 */
	interface Props {
		/** Whether to always show the interface picker. */
		alwaysOn_interfacePicker?: any;
		/** Metadata about the type being edited. */
		typeInfo?: any;
		/** The current value of the input. */
		rawValue?: any;
		/** The value to be dispatched (usually the same as rawValue). */
		dispatchValue?: any;
		/** Callback function triggered when the value changes. */
		onChanged?: (detail: { chd_rawValue: any }) => void;
	}

	let {
		alwaysOn_interfacePicker,
		typeInfo,
		rawValue = $bindable(),
		dispatchValue,
		onChanged
	}: Props = $props();

	/**
	 * Handles input events and notifies the parent of changes.
	 * @param e - The input event.
	 */
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const newValue = target.value;
		// rawValue = newValue; // In Svelte 5, destructured props are read-only getters.
		// The parent will update the state and pass it back down through the rawValue prop.
		if (onChanged) {
			onChanged({ chd_rawValue: newValue });
		}
	}
</script>

<div class="form-control w-full">
	<input
		type="text"
		class="pointer-events-auto input input-bordered input-sm w-full"
		value={rawValue ?? ''}
		oninput={handleInput}
		placeholder={typeInfo?.dd_displayName || 'Value'}
	/>
</div>
