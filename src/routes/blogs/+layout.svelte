<script lang="ts">
	import '../../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen bg-[#0f1419] text-[#e4e6eb]">
	<!-- Blog Navigation -->
	<nav class="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.05)] bg-[#0f1419]/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<a href="/" class="text-xl font-bold tracking-tight hover:text-[#ffcfa0] transition-colors">
				dibakar
			</a>
			<div class="flex items-center gap-6">
				<a href="/" class="text-sm opacity-60 transition-opacity hover:opacity-100">
					Home
				</a>
				<span class="text-sm opacity-100 text-[#ffcfa0]">Blog</span>
			</div>
		</div>
	</nav>

	{@render children?.()}

	<!-- Footer -->
	<footer class="border-t border-[rgba(255,255,255,0.08)] px-8 py-12 text-center">
		<p class="m-0 text-sm opacity-60">© {new Date().getFullYear()} Dibakar. Crafted with precision and passion.</p>
	</footer>
</div>

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