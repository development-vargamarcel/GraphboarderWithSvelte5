<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Moon, Sun } from 'lucide-svelte';

	let theme = $state('light');

	onMount(() => {
		const storedTheme = localStorage.getItem('theme');
		if (storedTheme) {
			theme = storedTheme;
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			theme = 'dark';
		}
		updateTheme(theme);
	});

	function updateTheme(newTheme: string) {
		document.documentElement.classList.toggle('dark', newTheme === 'dark');
		document.documentElement.setAttribute('data-theme', newTheme);
	}

	const toggleTheme = () => {
		theme = theme === 'light' ? 'dark' : 'light';
		updateTheme(theme);
		localStorage.setItem('theme', theme);
	};
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleTheme}
	aria-label="Toggle Theme"
	title="Toggle Theme"
>
	{#if theme === 'light'}
		<Moon class="h-5 w-5" />
	{:else}
		<Sun class="h-5 w-5 text-yellow-500" />
	{/if}
</Button>
