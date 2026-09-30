<script lang="ts">
	import '../../app.css';
	import '$lib/blog/blog-images.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-bg text-fg transition-colors duration-500">
	<!-- Blog Navigation -->
	<nav
		class="sticky top-0 z-50 border-b border-line-soft bg-bg/95 backdrop-blur-sm"
		aria-label="Blog navigation"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<a href="/" class="text-xl font-bold tracking-tight transition-colors hover:text-accent">
				dibakar
			</a>
			<div class="flex items-center gap-6">
				<a href="/" class="text-sm text-muted transition-colors hover:text-fg">
					Home
				</a>
				<span class="text-sm text-accent" aria-current="page">Blog</span>
				<ThemeToggle />
			</div>
		</div>
	</nav>

	<main>
		{@render children?.()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-line-soft px-8 py-12 text-center">
		<p class="m-0 text-sm text-muted">
			© {new Date().getFullYear()} Dibakar. Crafted with precision and passion.
		</p>
	</footer>
</div>
