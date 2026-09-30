<script lang="ts">
	import '../app.css';
	import { initTheme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(initTheme);
</script>

{@render children?.()}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			'Space Grotesk',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		overflow-x: hidden;
	}
</style>
