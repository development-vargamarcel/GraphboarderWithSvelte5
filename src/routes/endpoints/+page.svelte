<script>
	import EndpointsList from '$lib/components/EndpointsList.svelte';
	import QMSWraper from '$lib/components/QMSWraper.svelte';
	import { localEndpoints } from '$lib/stores/testData/testEndpoints';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import AddEndpointToLocalStorage from '$lib/components/addEndpointToLocalStorage.svelte';
	import { getContext } from 'svelte';
	import { getSortedAndOrderedEndpoints, duplicateEndpoint } from '$lib/utils/usefulFunctions';
	import Tabs from '$lib/components/Tabs.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import EndpointsTable from '$lib/components/EndpointsTable.svelte';

	const localStorageEndpoints = getContext('localStorageEndpoints');

	let columns = [
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
	let showConfirmationModal = $state(false);
	let showDuplicateConfirmationModal = $state(false);
	let activeTab = $state('local');
	let endpointToDelete = $state(null);
	let endpointToDuplicate = $state(null);

	const deleteEndpoint = (endpoint) => {
		endpointToDelete = endpoint;
		showConfirmationModal = true;
	};

	const confirmDelete = () => {
		localStorageEndpoints.set(
			$localStorageEndpoints.filter((endpoint) => endpoint.id !== endpointToDelete.id)
		);
		endpointToDelete = null;
		showConfirmationModal = false;
	};

	const handleDuplicateEndpoint = (endpoint) => {
		endpointToDuplicate = endpoint;
		showDuplicateConfirmationModal = true;
	};

	const confirmDuplicate = () => {
		localStorageEndpoints.set(
			duplicateEndpoint(endpointToDuplicate, $localStorageEndpoints)
		);
		endpointToDuplicate = null;
		showDuplicateConfirmationModal = false;
	};

	const tabs = [
		{ id: 'local', label: 'Local' },
		{ id: 'localstorage', label: 'Local Storage' },
		{ id: 'remote', label: 'Remote' }
	];
</script>

<div class="p-4">
	<div class="flex justify-between items-center mb-4">
		<Tabs {tabs} bind:activeTab />
		<button class="btn btn-sm btn-primary" onclick={() => (showAddEndpoint = true)}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Endpoint
		</button>
	</div>

	<div class="mt-4">
		{#if activeTab === 'local'}
			<EndpointsTable
				data={getSortedAndOrderedEndpoints(localEndpoints, true)}
				{columns}
				onRowClicked={(detail) => {
					if (browser) {
						window.open(`${page.url.origin}/endpoints/localEndpoint--${detail.id}`, '_blank');
					}
				}}
			/>
		{/if}

		{#if activeTab === 'localstorage'}
			{#if $localStorageEndpoints.length === 0}
				<div
					class="text-center p-8 flex flex-col items-center justify-center h-full min-h-[50vh]"
				>
					<svg
						class="w-24 h-24 mx-auto text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
						></path>
					</svg>
					<h2 class="text-2xl font-bold mb-4">No Local Endpoints Yet</h2>
					<p class="mb-4 max-w-md">
						You don't have any local endpoints configured yet. Get started by adding a new endpoint
						to explore your GraphQL API.
					</p>
					<button class="btn btn-primary" onclick={() => (showAddEndpoint = true)}>
						Add Your First Endpoint
					</button>
				</div>
			{:else}
				<EndpointsTable
					data={$localStorageEndpoints}
					{columns}
					onRowClicked={(detail) => {
						if (browser) {
							window.open(
								`${page.url.origin}/endpoints/localstorageEndpoint--${detail.id}`,
								'_blank'
							);
						}
					}}
					onDeleteRow={deleteEndpoint}
					onDuplicateRow={handleDuplicateEndpoint}
				/>
			{/if}
		{/if}

		{#if activeTab === 'remote'}
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

<ConfirmationModal
	bind:show={showConfirmationModal}
	onConfirm={confirmDelete}
	onCancel={() => (showConfirmationModal = false)}
/>

<ConfirmationModal
	bind:show={showDuplicateConfirmationModal}
	onConfirm={confirmDuplicate}
	onCancel={() => (showDuplicateConfirmationModal = false)}
	title="Confirm Duplication"
	message={`Are you sure you want to duplicate "${endpointToDuplicate?.description}"?`}
	confirmButtonText="Duplicate"
/>
