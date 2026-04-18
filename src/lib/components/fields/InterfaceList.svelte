<script lang="ts">
	/**
	 * @component
	 * InterfaceList component for GraphQL list arguments.
	 * Manages a list of Interface components, allowing adding and removing items.
	 */
	import Interface from '$lib/components/fields/Interface.svelte';

	interface Props {
		/** Whether to always show the interface picker. */
		alwaysOn_interfacePicker?: any;
		/** Metadata about the type being edited. */
		typeInfo?: any;
		/** The current list of values. */
		rawValue?: any;
		/** The value to be dispatched. */
		dispatchValue?: any;
		/** Callback function triggered when the list changes. */
		onChanged?: (detail: { chd_rawValue: any[] }) => void;
	}

	let {
		alwaysOn_interfacePicker,
		typeInfo,
		rawValue = $bindable([]),
		dispatchValue,
		onChanged
	}: Props = $props();

	// Ensure rawValue is an array
	if (!Array.isArray(rawValue)) {
		rawValue = rawValue ? [rawValue] : [];
	}

	/**
	 * Adds a new empty item to the list.
	 */
	function addItem() {
		rawValue = [...rawValue, ''];
		notifyChange();
	}

	/**
	 * Removes an item from the list by its index.
	 * @param index - The index of the item to remove.
	 */
	function removeItem(index: number) {
		rawValue = rawValue.filter((_: any, i: number) => i !== index);
		notifyChange();
	}

	/**
	 * Handles changes to an individual item in the list.
	 * @param index - The index of the item that changed.
	 * @param detail - The change detail from the Interface component.
	 */
	function handleItemChange(index: number, detail: any) {
		rawValue[index] = detail.chd_rawValue;
		rawValue = [...rawValue];
		notifyChange();
	}

	/**
	 * Notifies the parent component of changes to the list.
	 */
	function notifyChange() {
		if (onChanged) {
			onChanged({ chd_rawValue: rawValue });
		}
	}
</script>

<div class="flex flex-col space-y-2">
	{#each rawValue as item, index}
		<div class="flex items-center space-x-2">
			<div class="grow">
				<Interface
					{typeInfo}
					rawValue={item}
					onChanged={(detail) => handleItemChange(index, detail)}
				/>
			</div>
			<button
				class="btn btn-square btn-ghost btn-xs"
				onclick={() => removeItem(index)}
				aria-label="Remove item"
			>
				<i class="bi bi-trash"></i>
			</button>
		</div>
	{/each}
	<button class="btn btn-primary btn-xs w-min" onclick={addItem}>
		<i class="bi bi-plus"></i> Add item
	</button>
</div>
