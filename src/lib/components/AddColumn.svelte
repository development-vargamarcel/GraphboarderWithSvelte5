<script lang="ts">
	import _ from 'lodash';

	import TypeList from '$lib/components/TypeList.svelte';
	import {
		generateTitleFromStepsOfFields,
		stepsOfFieldsToQueryFragmentObject
	} from '$lib/utils/usefulFunctions';
	import { setContext, getContext } from 'svelte';
	import { get, writable, type Writable } from 'svelte/store';
	import Type from './Type.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { PlusCircle } from 'lucide-svelte';

	/**
	 * Props for AddColumn component.
	 */
	interface Props {
		prefix?: string;
		column_stepsOfFields: any;
		addColumnFromInput?: any;
		dd_relatedRoot: any;
		QMSName: any;
		QMS_info: any;
		onNewColumnAddRequest?: (detail: any) => void;
	}

	let {
		prefix = '',
		column_stepsOfFields = $bindable(),
		addColumnFromInput,
		dd_relatedRoot,
		QMSName,
		QMS_info,
		onNewColumnAddRequest
	}: Props = $props();

	setContext(`${prefix}stepsOfFieldsOBJ`, writable({}));
	const stepsOfFieldsOBJ = getContext(`${prefix}stepsOfFieldsOBJ`) as Writable<any>;
	setContext(`${prefix}stepsOfFieldsOBJFull`, writable({}));
	const stepsOfFieldsOBJFull = getContext(`${prefix}stepsOfFieldsOBJFull`) as Writable<any>;

	const qmsWraperContext = getContext(`${prefix}QMSWraperContext`) as any;
	const { tableColsData_Store, activeArgumentsDataGrouped_Store } = qmsWraperContext;
	tableColsData_Store.subscribe((cols: any) => {
		$stepsOfFieldsOBJFull = _.merge(
			{},
			...cols.map((col: any) => {
				return col.stepsOfFieldsOBJ;
			})
		);
	});
	setContext(`${prefix}StepsOfFieldsSelected`, writable(new Set([])));
	const StepsOfFieldsSelected = getContext(`${prefix}StepsOfFieldsSelected`) as Writable<any>;
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="outline"
				size="icon"
				class="h-6 w-full"
				{...props}
				data-testid="add-column-button"
			>
				<PlusCircle class="h-4 w-4" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[300px] sm:w-[450px] md:w-[600px] lg:w-[800px] p-0" data-testid="add-column-dropdown">
		<div class="max-h-[70vh] overflow-auto p-4 overscroll-contain">
			<div class="flex flex-col space-y-4">
				<div class="flex gap-2">
					<Input
						type="text"
						placeholder="(> or .) producer>films>title"
						bind:value={column_stepsOfFields}
						onkeypress={addColumnFromInput}
						class="h-8"
					/>
					<Button
						size="sm"
						onclick={() => {
							let stepsOfFields: string[] = [];
							let tableColData = {
								title: `col-${Math.floor(Math.random() * 200)},${generateTitleFromStepsOfFields(
									stepsOfFields
								)},stepsOfFieldsOBJ `,
								stepsOfFields: stepsOfFields,
								stepsOfFieldsOBJ: $stepsOfFieldsOBJ,
								activeArgumentsDataGrouped: $activeArgumentsDataGrouped_Store
							};
							onNewColumnAddRequest?.(tableColData);
							$stepsOfFieldsOBJ = {};
						}}
					>
						Add
					</Button>
				</div>

				{#if QMS_info}
					<div class="text-sm font-normal normal-case">
						<Type
							type={QMS_info}
							template="columnAddDisplay"
							depth={0}
							isOnMainList={true}
							index={0}
							oncolAddRequest={onNewColumnAddRequest}
						/>
					</div>
				{/if}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
