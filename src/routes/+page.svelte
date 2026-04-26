<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
	<div class="w-full max-w-4xl overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl flex flex-col lg:flex-row-reverse">
		<div class="flex h-full w-full items-center justify-center bg-primary/10 p-10 lg:w-1/2 min-h-[300px]">
			<i class="bi bi-graph-up-arrow text-9xl text-primary opacity-80"></i>
		</div>
		<div class="w-full p-8 lg:w-1/2 lg:p-12 flex flex-col justify-center">
			<h1 class="mb-6 text-5xl font-bold tracking-tight">GraphQL Explorer</h1>
			<p class="py-6 text-lg text-muted-foreground">
				Explore, visualize, and interact with your GraphQL data. Connect to any endpoint or use
				our demo APIs to see it in action.
			</p>
			<ul class="mb-8 space-y-3 text-muted-foreground">
				<li class="flex items-center gap-2">
					<i class="bi bi-check-circle-fill text-green-500"></i> Visual Data Exploration
				</li>
				<li class="flex items-center gap-2">
					<i class="bi bi-check-circle-fill text-green-500"></i> Multiple Endpoint Support
				</li>
				<li class="flex items-center gap-2">
					<i class="bi bi-check-circle-fill text-green-500"></i> Local Storage Persistence
				</li>
			</ul>
			<div class="flex gap-4">
				<a href="/endpoints" class={buttonVariants({ size: 'lg', class: 'gap-2' })}>
					Get Started <i class="bi bi-arrow-right"></i>
				</a>
				<a
					href="https://github.com/files-community/GraphboarderWithSvelte5"
					target="_blank"
					class={buttonVariants({ variant: 'ghost', size: 'lg', class: 'gap-2' })}
				>
					<i class="bi bi-github"></i> GitHub
				</a>
			</div>
		</div>
	</div>
</main>
