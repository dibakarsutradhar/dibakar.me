<script lang="ts">
	import type { PageData } from './$types';
	import { formatDate } from '$lib/blog';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { content: Content, metadata } = $derived(data);
</script>

<svelte:head>
	<title>{metadata.title} | Dibakar Sutra Dhar</title>
	<meta name="description" content={metadata.excerpt} />
	<meta property="og:title" content={metadata.title} />
	<meta property="og:description" content={metadata.excerpt} />
	{#if metadata.headerImage}
		<meta property="og:image" content={metadata.headerImage} />
	{/if}
</svelte:head>

<article class="mx-auto max-w-3xl px-6 py-16">
	<!-- Back link -->
	<a
		href="/blogs"
		class="mb-8 inline-flex items-center gap-2 opacity-60 transition-opacity hover:opacity-100"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
		</svg>
		Back to blog
	</a>

	<!-- Header -->
	<header class="mb-12">
		<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
			<span class="rounded-full bg-[#ffcfa0]/10 px-3 py-1 text-[#ffcfa0]">
				{metadata.category}
			</span>
			<span class="opacity-50">{formatDate(metadata.date)}</span>
		</div>

		<h1 class="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
			{metadata.title}
		</h1>

		<p class="text-xl opacity-70">{metadata.excerpt}</p>

		<div class="mt-6 flex flex-wrap gap-2">
			{#each metadata.tags as tag}
				<span
					class="rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1 text-sm opacity-60"
				>
					#{tag}
				</span>
			{/each}
		</div>
	</header>

	<!-- Header image -->
	{#if metadata.headerImage}
		<div class="mb-12 overflow-hidden rounded-xl">
			<img
				src={metadata.headerImage}
				alt={metadata.title}
				class="h-auto w-full object-cover"
			/>
		</div>
	{/if}

	<!-- Content -->
	<div class="prose prose-invert prose-lg max-w-none">
		<Content />
	</div>

	<!-- Footer -->
	<footer class="mt-16 border-t border-[rgba(255,255,255,0.08)] pt-8">
		<div class="flex items-center justify-between">
			<div class="flex flex-wrap gap-2">
				{#each metadata.tags as tag}
					<span
						class="rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1 text-sm opacity-60"
					>
						#{tag}
					</span>
				{/each}
			</div>
			<a
				href="/blogs"
				class="inline-flex items-center gap-2 opacity-60 transition-opacity hover:opacity-100"
			>
				All posts
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</a>
		</div>
	</footer>
</article>

<style>
	:global(.prose) {
		--tw-prose-body: inherit;
		--tw-prose-headings: inherit;
		--tw-prose-links: #ffcfa0;
		--tw-prose-code: #ffcfa0;
		--tw-prose-pre-bg: rgba(255, 255, 255, 0.05);
	}

	:global(.prose h1) {
		font-size: 2.5rem;
		font-weight: 700;
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	:global(.prose h2) {
		font-size: 1.75rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
	}

	:global(.prose h3) {
		font-size: 1.375rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	:global(.prose p) {
		margin-bottom: 1.25rem;
		line-height: 1.8;
	}

	:global(.prose ul),
	:global(.prose ol) {
		margin-bottom: 1.25rem;
		padding-left: 1.5rem;
	}

	:global(.prose li) {
		margin-bottom: 0.5rem;
	}

	:global(.prose a) {
		color: #ffcfa0;
		text-decoration: underline;
		text-decoration-color: rgba(255, 207, 160, 0.3);
		transition: text-decoration-color 0.2s;
	}

	:global(.prose a:hover) {
		text-decoration-color: #ffcfa0;
	}

	:global(.prose code) {
		background: rgba(255, 255, 255, 0.05);
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	:global(.prose pre) {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
		overflow-x: auto;
		margin-bottom: 1.5rem;
	}

	:global(.prose pre code) {
		background: transparent;
		padding: 0;
		font-size: 0.875rem;
		line-height: 1.7;
	}

	:global(.prose blockquote) {
		border-left: 3px solid #ffcfa0;
		padding-left: 1rem;
		font-style: italic;
		opacity: 0.8;
		margin: 1.5rem 0;
	}

	:global(.prose hr) {
		border-color: rgba(255, 255, 255, 0.1);
		margin: 2rem 0;
	}

	:global(.prose img) {
		border-radius: 0.5rem;
		margin: 1.5rem 0;
	}

	:global(.prose strong) {
		font-weight: 600;
	}

	:global(.prose em) {
		font-style: italic;
	}
</style>