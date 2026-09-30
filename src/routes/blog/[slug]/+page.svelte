<script lang="ts">
	import type { PageData } from './$types';
	import { formatDate, getImageMeta } from '$lib/blog';
	import { BlogLightbox } from '$lib/components';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { content: Content, metadata } = $derived(data);
	let cover = $derived(getImageMeta(metadata.headerImage));

	const SITE_URL = 'https://dibakar.me';
</script>

<svelte:head>
	<title>{metadata.title} | Dibakar Sutra Dhar</title>
	<meta name="description" content={metadata.excerpt} />
	<link rel="canonical" href="{SITE_URL}/blog/{metadata.slug}" />

	<meta property="og:type" content="article" />
	<meta property="og:title" content={metadata.title} />
	<meta property="og:description" content={metadata.excerpt} />
	<meta property="og:url" content="{SITE_URL}/blog/{metadata.slug}" />
	{#if metadata.headerImage}
		<meta property="og:image" content="{SITE_URL}{metadata.headerImage}" />
	{/if}
	<meta name="twitter:card" content={metadata.headerImage ? 'summary_large_image' : 'summary'} />
</svelte:head>

<article class="mx-auto max-w-3xl px-6 py-16">
	<!-- Back link -->
	<a
		href="/blog"
		class="mb-8 inline-flex items-center gap-2 text-muted transition-colors hover:text-fg"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
		</svg>
		Back to blog
	</a>

	<!-- Header -->
	<header class="mb-12">
		<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
			<span class="rounded-full bg-accent/10 px-3 py-1 text-accent">
				{metadata.category}
			</span>
			<span class="text-muted">{formatDate(metadata.date)}</span>
		</div>

		<h1 class="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
			{metadata.title}
		</h1>

		<p class="text-xl text-muted">{metadata.excerpt}</p>

		<div class="mt-6 flex flex-wrap gap-2">
			{#each metadata.tags as tag}
				<span class="rounded-full border border-line-soft px-3 py-1 text-sm text-muted">
					#{tag}
				</span>
			{/each}
		</div>
	</header>

	<!-- Cover image: the one image above the fold, so load it eagerly and at a
	     higher priority than the body images. -->
	{#if metadata.headerImage}
		<figure class="blog-figure mb-12">
			<a
				href={metadata.headerImage}
				target="_blank"
				rel="noopener"
				class="blog-image__zoom"
				data-zoomable="true"
				aria-label="View the cover image full size"
			>
				<img
					src={metadata.headerImage}
					alt={metadata.headerImageAlt}
					class="blog-image"
					width={cover?.width}
					height={cover?.height}
					loading="eager"
					fetchpriority="high"
					decoding="async"
				/>
			</a>
			{#if metadata.headerImageCaption}
				<figcaption class="blog-figure__caption">{metadata.headerImageCaption}</figcaption>
			{/if}
		</figure>
	{/if}

	<!-- Content -->
	<div class="prose prose-lg max-w-none">
		<Content />
	</div>

	<!-- Footer -->
	<footer class="mt-16 border-t border-line-soft pt-8">
		<div class="flex items-center justify-between">
			<div class="flex flex-wrap gap-2">
				{#each metadata.tags as tag}
					<span class="rounded-full border border-line-soft px-3 py-1 text-sm text-muted">
						#{tag}
					</span>
				{/each}
			</div>
			<a href="/blog" class="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg">
				All posts
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</a>
		</div>
	</footer>
</article>

<BlogLightbox />

<style>
	:global(.prose) {
		--tw-prose-body: inherit;
		--tw-prose-headings: inherit;
		--tw-prose-links: var(--accent);
		--tw-prose-code: var(--accent);
		--tw-prose-quotes: var(--fg);
		--tw-prose-quote-borders: var(--accent);
		--tw-prose-captions: var(--muted);
		--tw-prose-counters: var(--muted);
		--tw-prose-bullets: var(--muted);
		--tw-prose-hr: var(--border);
		--tw-prose-th-borders: var(--border);
		--tw-prose-td-borders: var(--border);
		--tw-prose-pre-bg: var(--card);
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
		color: var(--accent);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--accent) 30%, transparent);
		transition: text-decoration-color 0.2s;
	}

	:global(.prose a:hover) {
		text-decoration-color: var(--accent);
	}

	:global(.prose code) {
		background: var(--card);
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	:global(.prose pre) {
		background: var(--card);
		border: 1px solid var(--border-soft);
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
		border-left: 3px solid var(--accent);
		padding-left: 1rem;
		font-style: italic;
		margin: 1.5rem 0;
	}

	:global(.prose hr) {
		border-color: var(--border);
		margin: 2rem 0;
	}

	/* Image, figure and gallery styling lives in $lib/blog/blog-images.css so it
	   also applies to hand-written HTML inside a post. */

	:global(.prose strong) {
		font-weight: 600;
	}

	:global(.prose em) {
		font-style: italic;
	}
</style>
