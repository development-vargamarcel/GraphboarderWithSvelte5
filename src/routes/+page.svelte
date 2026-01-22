<script lang="ts">
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<main class="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4">
	<div class="hero bg-base-100 rounded-box shadow-xl max-w-4xl w-full overflow-hidden">
		<div class="hero-content flex-col lg:flex-row-reverse p-0">
			<div class="bg-primary/10 h-full w-full lg:w-1/2 flex items-center justify-center p-10">
				<i class="bi bi-graph-up-arrow text-9xl text-primary opacity-80"></i>
			</div>
			<div class="w-full lg:w-1/2 p-8 lg:p-12">
				<h1 class="text-5xl font-bold text-base-content mb-6">GraphQL Explorer</h1>
				<p class="py-6 text-lg text-base-content/70">
					Explore, visualize, and interact with your GraphQL data. Connect to any endpoint or use
					our demo APIs to see it in action.
				</p>
				<ul class="space-y-3 mb-8 text-base-content/80">
					<li class="flex items-center gap-2">
						<i class="bi bi-check-circle-fill text-success"></i> Visual Data Exploration
					</li>
					<li class="flex items-center gap-2">
						<i class="bi bi-check-circle-fill text-success"></i> Multiple Endpoint Support
					</li>
					<li class="flex items-center gap-2">
						<i class="bi bi-check-circle-fill text-success"></i> Local Storage Persistence
					</li>
				</ul>
				<div class="flex gap-4">
					<a href="/endpoints" class="btn btn-primary btn-lg gap-2">
						Get Started <i class="bi bi-arrow-right"></i>
					</a>
					<a
						href="https://github.com/files-community/GraphboarderWithSvelte5"
						target="_blank"
						class="btn btn-ghost btn-lg"
					>
						<i class="bi bi-github"></i> GitHub
					</a>
				</div>
			</div>
		</div>
	</div>
</main>
