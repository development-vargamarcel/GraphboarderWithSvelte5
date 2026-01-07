<script>
	import EndpointsList from '$lib/components/EndpointsList.svelte';
	import QMSWraper from '$lib/components/QMSWraper.svelte';
	import { localEndpoints } from '$lib/stores/testData/testEndpoints';
	import ExplorerTable from '$lib/components/ExplorerTable.svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import AddEndpointToLocalStorage from '$lib/components/addEndpointToLocalStorage.svelte';
	import { getContext } from 'svelte';
	import { getSortedAndOrderedEndpoints } from '$lib/utils/usefulFunctions';
	import Tabs from '$lib/components/Tabs.svelte';
	import Modal from '$lib/components/Modal.svelte';

	const localStorageEndpoints = getContext('localStorageEndpoints');

	let columns = [
		{
			accessorFn: (row) => row.id,
			header: 'id',
			footer: 'id',
			enableHiding: true
		},
		{
			accessorFn: (row) => row.description,
			header: 'description',
			footer: 'description',
			enableHiding: true
		},
		{
			accessorFn: (row) => row.url,
			header: 'url',
			footer: 'url',
			enableHiding: true
		}
	];

	let showAddEndpoint = $state(false);
	let selectedRows = $state([]);
	let activeTab = $state('local');

	const handleRowSelectionChange = (detail) => {
		selectedRows = detail.rows.map((row) => row.original);
	};

	const deleteSelectedEndpoint = () => {
		localStorageEndpoints.set(
			$localStorageEndpoints.filter((endpoint) => {
				return !selectedRows.some((row) => {
					return row.id == endpoint.id;
				});
			})
		);
		selectedRows = [];
	};

	const tabs = [
		{ id: 'local', label: 'Local' },
		{ id: 'localstorage', label: 'Local Storage' },
		{ id: 'remote', label: 'Remote' }
	];
</script>

<div class="p-4">
	<Tabs {tabs} bind:activeTab />

	<div class="mt-4">
		{#if activeTab === 'local'}
			<div class="mx-auto pl-4 pt-4 h-[50vh]">
				<ExplorerTable
					onRowClicked={(detail) => {
						if (browser) {
							window.open(`${page.url.origin}/endpoints/localEndpoint--${detail.id}`, '_blank');
						}
					}}
					enableMultiRowSelectionState={false}
					data={getSortedAndOrderedEndpoints(localEndpoints, true)}
					{columns}
					onRowSelectionChange={() => {}}
				/>
			</div>
		{/if}

		{#if activeTab === 'localstorage'}
			{#if selectedRows.length > 0}
				<button class="btn btn-sm btn-warning mb-2" onclick={deleteSelectedEndpoint}>
					Delete Selected Rows
				</button>
			{/if}
			<button class="btn btn-sm btn-primary mb-2" onclick={() => (showAddEndpoint = true)}>
				Add Endpoint
			</button>
			<div class="mx-auto pl-4 pt-4 h-[50vh]">
				{#key $localStorageEndpoints}
					<ExplorerTable
						onRowSelectionChange={handleRowSelectionChange}
						onRowClicked={(detail) => {
							if (browser) {
								window.open(
									`${page.url.origin}/endpoints/localstorageEndpoint--${detail.id}`,
									'_blank'
								);
							}
						}}
						enableMultiRowSelectionState
						data={$localStorageEndpoints}
						{columns}
					/>
				{/key}
			</div>
		{/if}

		{#if activeTab === 'remote'}
			<div class="w-full p-2">
				<div class="card w-full glass">
					<div class="card-body">
						<h2 class="card-title">Add new Endpoint</h2>
						<p>To remote db</p>
						<a href="/endpoints/localEndpoint--nhost/mutations/insert_endpoints_one">
							/endpoints/localEndpoint--nhost/mutations/insert_endpoints_one
						</a>
						<a href="/endpoints/localEndpoint--nhostRelay/mutations/insert_endpoints_one">
							/endpoints/localEndpoint--nhostRelay/mutations/insert_endpoints_one
						</a>
					</div>
				</div>
			</div>
			<QMSWraper
				isOutermostQMSWraper={true}
				QMSName="endpoints"
				tableColsData_StoreInitialValue={[
					{ title: 'provider name', stepsOfFields: ['endpoints', 'configuration', 'id'] },
					{ title: 'provider id', stepsOfFields: ['endpoints', 'configuration', 'id'] },
					{
						title: 'configuration',
						stepsOfFields: ['endpoints', 'configuration', 'configuration']
					}
				]}
			>
				<div class="pt-2">
					<EndpointsList QMSName="endpoints" />
				</div>
			</QMSWraper>
		{/if}
	</div>
</div>

<Modal bind:show={showAddEndpoint}>
	<AddEndpointToLocalStorage onHide={() => (showAddEndpoint = false)} />
</Modal>
