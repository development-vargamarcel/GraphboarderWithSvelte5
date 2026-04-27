<script lang="ts">
	import {
		deleteValueAtPath,
		generateTitleFromStepsOfFields,
		getPreciseType,
		getRootType,
		getValueAtPath,
		setValueAtPath,
		stepsOfFieldsToQueryFragmentObject,
		typeToSchemaJson
	} from '$lib/utils/usefulFunctions';
	import _ from 'lodash';

	import { getContext, untrack } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ActiveArguments from '$lib/components/ActiveArguments.svelte';
	import QMSWraper from '$lib/components/QMSWraper.svelte';
	import { get, type Writable } from 'svelte/store';
	import type { QMSWraperContext } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		canExpand: any;
		expand: any;
		type: any;
		index: any;
		showExpand: any;
		template?: string;
		stepsOfFields: any;
		prefix?: string;
	}

	let {
		canExpand,
		expand,
		type,
		index,
		showExpand,
		template = 'default',
		stepsOfFields,
		prefix = ''
	}: Props = $props();

	const wraperContext = getContext(`${prefix}QMSWraperContext`) as any;
	let mainWraperContext = getContext(`${prefix}QMSMainWraperContext`) as any;
	const schemaData = mainWraperContext?.schemaData;
	const tableColsData_Store = wraperContext?.tableColsData_Store;
	const stepsOfFieldsOBJ = getContext(`${prefix}stepsOfFieldsOBJ`) as Writable<any>;
	const stepsOfFieldsOBJFull = getContext(`${prefix}stepsOfFieldsOBJFull`) as Writable<any>;

	const stepsOFieldsAsQueryFragmentObject = stepsOfFieldsToQueryFragmentObject(
		stepsOfFields,
		false
	);
	let isSelected = $state(false);
	let hasSelected = $state(false);

	$effect(() => {
		if (!$stepsOfFieldsOBJ) {
			isSelected = false;
			hasSelected = false;
			return;
		}
		const valueAtPath = getValueAtPath($stepsOfFieldsOBJ, stepsOfFields);
		const typeAtPath = getPreciseType(valueAtPath);
		if (typeAtPath == 'undefined') {
			hasSelected = false;
			isSelected = false;
		} else if (typeAtPath == 'string') {
			hasSelected = true;
			isSelected = true;
		} else if (typeAtPath == 'object') {
			isSelected = false;
			hasSelected = true;
		}
	});

	let isUsedInSomeColumn = $derived.by(() => {
		if (!$stepsOfFieldsOBJFull) return false;
		const valueAtPath = getValueAtPath($stepsOfFieldsOBJFull, stepsOfFields);
		const typeAtPath = getPreciseType(valueAtPath);
		return typeAtPath != 'undefined';
	});

	let hasQMSarguments = $derived.by(() => {
		if (!$stepsOfFieldsOBJFull) return false;
		const valueAtPath = getValueAtPath($stepsOfFieldsOBJFull, stepsOfFields) as any;
		return valueAtPath?.QMSarguments;
	});

	let showJsonInfo = $state(false);
	let showModal = $state(false);
	let activeArgumentsQMSWraperContext = $state<QMSWraperContext>();
	let canAcceptArguments = $derived(type.args?.length > 0);

	const mergedChildren_finalGqlArgObj_Store = wraperContext?.mergedChildren_finalGqlArgObj_Store;
	const mergedChildren_QMSWraperCtxData_Store = wraperContext?.mergedChildren_QMSWraperCtxData_Store;
	let activeArgumentsDataGrouped_Store = getContext(
		`${prefix}activeArgumentsDataGrouped_Store`
	) as Writable<any>;

	$effect(() => {
		const ctx = activeArgumentsQMSWraperContext;
		const canAccept = canAcceptArguments;
		if (!ctx || !mergedChildren_QMSWraperCtxData_Store) return;
		untrack(() => {
			if (canAccept) {
				mergedChildren_QMSWraperCtxData_Store.addOrReplace({
					stepsOfFields,
					...ctx
				});
			}

			if (activeArgumentsDataGrouped_Store) {
				$activeArgumentsDataGrouped_Store = get(ctx.activeArgumentsDataGrouped_Store);
			}
		});
	});

	let currentQMSArguments = $derived(
		mergedChildren_finalGqlArgObj_Store
			? getValueAtPath($mergedChildren_finalGqlArgObj_Store, [...stepsOfFields, 'QMSarguments'])
			: undefined
	);
</script>

{#if template == 'default'}
	<div class="pointer-events-auto flex w-full min-w-max items-center space-x-2 py-1">
		<div class="pointer-events-auto flex w-1/3 min-w-max items-center space-x-2">
			{#if canExpand}
				<Button
					variant="outline"
					size="icon-xs"
					class="pointer-events-auto h-6 w-6"
					onclick={expand}
				>
					{showExpand ? '-' : '+'}
				</Button>
			{:else}
				<Button
					variant="outline"
					size="icon-xs"
					class="h-6 w-6 opacity-50"
					disabled
				>
					+
				</Button>
			{/if}
			<Badge variant="secondary" class="h-6 px-1.5 font-mono text-[10px]">{index + 1}</Badge>
			<Badge variant="default" class="h-6 px-2 font-medium">
				{type.dd_displayName}
			</Badge>
		</div>
		{#if !canExpand}
			<Badge variant="outline" class="h-6 bg-muted/30 px-2 text-[10px]">
				{#if type.dd_displayName == type.dd_namesArray[type.dd_namesArray.length - 1]}{:else}
					{type.dd_namesArray[type.dd_namesArray.length - 1]}
				{/if}
			</Badge>
		{/if}
		{#if canExpand}
			<Badge variant="secondary" class="h-6 bg-accent/20 px-2 text-[10px] text-accent-foreground">
				{#if type.dd_namesArray?.[1] && type.dd_namesArray?.[1] !== type.dd_displayName}
					{type.dd_namesArray?.[1]}
				{:else}
					{type.dd_namesArray?.[0]}
				{/if}
			</Badge>
		{/if}
		<div class="pointer-events-auto flex-1">
			<div class="flex items-center gap-1 overflow-hidden">
				{#each type.dd_kindsArray || [] as kind}
					<Badge variant="outline" class="h-5 px-1 text-[9px] uppercase tracking-tighter opacity-70">{kind}</Badge>
				{/each}
			</div>
		</div>
		<div class="pointer-events-auto flex items-center pr-2">
			{#if type.args?.length > 0}
				<Button
					variant="ghost"
					size="icon-xs"
					class="pointer-events-auto h-7 w-7 {hasQMSarguments ? 'text-primary bg-primary/10' : 'opacity-70 hover:opacity-100'}"
					data-testid="funnel-button-{type.dd_displayName}-DEFAULT"
					onclick={(e) => {
						e.stopPropagation();
						showModal = true;
					}}
					title="Configure Arguments"
				>
					<i class="bi {currentQMSArguments ? 'bi-funnel-fill' : 'bi-funnel'} text-[10px]"></i>
				</Button>

				<QMSWraper
					bind:QMSWraperContext={activeArgumentsQMSWraperContext}
					QMSName={type.dd_displayName}
					QMSType="query"
					QMS_info={type}
					QMSWraperContextGiven={mergedChildren_QMSWraperCtxData_Store?.getObj(stepsOfFields)}
				>
					<Modal
						bind:show={showModal}
						modalIdentifier="activeArgumentsDataModal"
						showApplyBtn={false}
						onCancel={(detail: any) => {
							if (detail.modalIdentifier == 'activeArgumentsDataModal') {
								showModal = false;
							}
						}}
					>
						<div class="w-full">
							<div class="mb-4 flex items-center gap-2 border-b pb-4">
								<i class="bi bi-arrow-return-right text-muted-foreground"></i>
								<h2 class="text-xl font-bold tracking-tight">Arguments for {type.dd_displayName}</h2>
							</div>

							<div class="mx-auto space-y-4 py-2">
								<ActiveArguments
									stepsOfFieldsThisAppliesTo={stepsOfFields}
									QMSarguments={getValueAtPath($mergedChildren_finalGqlArgObj_Store, [
										...stepsOfFields,
										'QMSarguments'
									])}
								/>
							</div>
						</div>
					</Modal>
				</QMSWraper>
			{/if}
			<Button
				variant="ghost"
				size="icon-xs"
				class="h-7 w-7"
				onclick={() => (showJsonInfo = true)}
				title="Show type info as JSON"
				aria-label="Show type info as JSON"
			>
				<i class="bi bi-braces"></i>
			</Button>
		</div>
	</div>

	<Modal
		bind:show={showJsonInfo}
		modalIdentifier="typeJsonInfoModal"
		showApplyBtn={false}
		onCancel={() => (showJsonInfo = false)}
	>
		<h3 class="mb-4 text-lg font-semibold tracking-tight">{type.dd_displayName} — type info</h3>
		<pre class="max-h-[60vh] overflow-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-relaxed">{typeToSchemaJson(type)}</pre>
	</Modal>
{:else if template == 'columnAddDisplay'}
	<div
		class="group pointer-events-auto flex w-full min-w-max cursor-pointer items-center rounded-md p-1 text-sm transition-colors hover:bg-muted/50"
		role="presentation"
	>
		{#if canExpand}
			<div class="pointer-events-auto flex w-8 items-center justify-center">
				<Button
					variant="ghost"
					size="icon-xs"
					class="pointer-events-auto h-6 w-6 transition-transform {showExpand ? 'rotate-90' : ''}"
					onclick={(e) => {
						e.stopPropagation();
						expand();
					}}
					aria-label={showExpand ? 'Collapse' : 'Expand'}
				>
					<i class="bi bi-chevron-right text-[10px]"></i>
				</Button>
			</div>
		{/if}

		{#if !canExpand}
			<div class="pointer-events-auto flex w-8 items-center justify-center">
				<Checkbox
					checked={isSelected}
					class="pointer-events-auto h-4 w-4"
					onCheckedChange={(checked) => {
						isSelected = !!checked;
						if (isSelected) {
							$stepsOfFieldsOBJ = _.merge($stepsOfFieldsOBJ, stepsOFieldsAsQueryFragmentObject);
						} else {
							$stepsOfFieldsOBJ = deleteValueAtPath($stepsOfFieldsOBJ, stepsOfFields);
						}
					}}
				/>
			</div>
		{/if}

		<div
			role="button"
			tabindex="0"
			class="pointer-events-auto flex flex-1 items-center gap-2 pr-2 font-medium"
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					if (canExpand) {
						expand();
					} else {
						let tableColData = {
							title: `col-${Math.floor(Math.random() * 200)},${generateTitleFromStepsOfFields(
								stepsOfFields
							)} `,
							stepsOfFields: stepsOfFields,
							stepsOfFieldsOBJ: stepsOfFieldsToQueryFragmentObject(stepsOfFields, false)
						};
						tableColsData_Store.addColumn(tableColData);
					}
				}
			}}
			onclick={() => {
				if (canExpand) {
					expand();
				} else {
					let tableColData = {
						title: `col-${Math.floor(Math.random() * 200)},${generateTitleFromStepsOfFields(
							stepsOfFields
						)} `,
						stepsOfFields: stepsOfFields,
						stepsOfFieldsOBJ: stepsOfFieldsToQueryFragmentObject(stepsOfFields, false)
					};
					tableColsData_Store.addColumn(tableColData);
				}
			}}
		>
			<span class="truncate">{type.dd_displayName}</span>

			{#if isUsedInSomeColumn}
				<i class="bi bi-check-circle-fill text-[10px] text-primary"></i>
			{/if}

			{#if canAcceptArguments}
				<Button
					variant="ghost"
					size="icon-xs"
					class="pointer-events-auto h-6 w-6 ml-auto {hasQMSarguments ? 'text-primary bg-primary/10' : 'opacity-0 group-hover:opacity-100 transition-opacity'}"
					data-testid="funnel-button-{type.dd_displayName}-COL_ADD"
					onclick={(e) => {
						e.stopPropagation();
						showModal = true;
					}}
					title="Configure Arguments"
				>
					<i class="bi {currentQMSArguments ? 'bi-funnel-fill' : 'bi-funnel'} text-[10px]"></i>
				</Button>

				<QMSWraper
					bind:QMSWraperContext={activeArgumentsQMSWraperContext}
					QMSName={type.dd_displayName}
					QMSType="query"
					QMS_info={type}
					QMSWraperContextGiven={wraperContext ? wraperContext.mergedChildren_QMSWraperCtxData_Store.getObj(stepsOfFields) : undefined}
				>
					<Modal
						bind:show={showModal}
						modalIdentifier="activeArgumentsDataModal"
						showApplyBtn={false}
						onCancel={(detail: any) => {
							if (detail.modalIdentifier == 'activeArgumentsDataModal') {
								showModal = false;
							}
						}}
					>
						<div class="w-full">
							<div class="mb-4 flex items-center gap-2 border-b pb-4">
								<i class="bi bi-arrow-return-right text-muted-foreground"></i>
								<h2 class="text-xl font-bold tracking-tight">Arguments for {type.dd_displayName}</h2>
							</div>

							<div class="mx-auto space-y-4 py-2">
								<ActiveArguments
									stepsOfFieldsThisAppliesTo={stepsOfFields}
									QMSarguments={getValueAtPath($mergedChildren_finalGqlArgObj_Store, [
										...stepsOfFields,
										'QMSarguments'
									])}
								/>
							</div>
						</div>
					</Modal>
				</QMSWraper>
			{/if}
		</div>
	</div>
{/if}
