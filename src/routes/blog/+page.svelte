<script lang="ts">
	import type { PageData } from './$types';
	import { getImageMeta, searchPosts } from '$lib/blog';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let searchQuery = $state('');
	let selectedCategory = $state<string | null>(null);
	let selectedTag = $state<string | null>(null);

	const SITE_URL = 'https://dibakar.me';

	// Get unique categories and all tags
	let categories = $derived([...new Set(data.posts.map((p) => p.category))]);
	let allTags = $derived([...new Set(data.posts.flatMap((p) => p.tags))]);

	let filteredPosts = $derived(() => {
		let posts = data.posts;

		// Filter by search query
		if (searchQuery.trim()) {
			posts = searchPosts(posts, searchQuery);
		}

		// Filter by category
		if (selectedCategory) {
			posts = posts.filter((p) => p.category === selectedCategory);
		}

		// Filter by tag
		if (selectedTag) {
			posts = posts.filter((p) => p.tags.includes(selectedTag));
		}

		return posts;
	});

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function clearAllFilters() {
		searchQuery = '';
		selectedCategory = null;
		selectedTag = null;
	}

	function toggleCategory(cat: string) {
		selectedCategory = selectedCategory === cat ? null : cat;
	}

	function toggleTag(tag: string) {
		selectedTag = selectedTag === tag ? null : tag;
	}
</script>

<svelte:head>
	<title>Blog | Dibakar Sutra Dhar</title>
	<meta name="description" content="Thoughts on software engineering, web3, and web development." />
	<link rel="canonical" href="{SITE_URL}/blog" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Blog | Dibakar Sutra Dhar" />
	<meta
		property="og:description"
		content="Thoughts on software engineering, web3, and web development."
	/>
	<meta property="og:url" content="{SITE_URL}/blog" />
</svelte:head>

<div class="mx-auto max-w-7xl px-6 py-16">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Blog</h1>
		<p class="text-lg text-muted">Thoughts on software engineering, web3, and web development.</p>
	</div>

	<div class="flex flex-col gap-12 lg:flex-row">
		<!-- Main Content -->
		<div class="flex-1">
			<!-- Search -->
			<div class="mb-8">
				<div class="relative">
					<svg
						class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						></path>
					</svg>
					<input
						type="text"
						placeholder="Search posts..."
						aria-label="Search posts"
						class="w-full rounded-lg border border-line bg-card px-12 py-3 text-fg backdrop-blur-sm transition-all focus:border-accent focus:outline-none placeholder:text-muted"
						bind:value={searchQuery}
					/>
					{#if searchQuery || selectedCategory || selectedTag}
						<button
							class="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-fg"
							onclick={clearAllFilters}
							aria-label="Clear all filters"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Active Filters -->
			{#if selectedCategory || selectedTag}
				<div class="mb-6 flex flex-wrap gap-2">
					{#if selectedCategory}
						<button
							onclick={() => toggleCategory(selectedCategory!)}
							class="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm text-accent transition-colors hover:bg-accent/20"
						>
							{selectedCategory}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
					{#if selectedTag}
						<button
							onclick={() => toggleTag(selectedTag!)}
							class="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm text-fg transition-colors hover:border-accent"
						>
							#{selectedTag}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<!-- Posts Grid -->
			{#if filteredPosts().length > 0}
				<div class="grid gap-8">
					{#each filteredPosts() as post, i (post.slug)}
						<a
							href="/blog/{post.slug}"
							class="group block overflow-hidden rounded-xl border border-line-soft bg-card transition-all hover:border-accent/30"
						>
							{#if post.headerImage}
								{@const cover = getImageMeta(post.headerImage)}
								<div class="aspect-video overflow-hidden">
									<!-- The newest post's cover is above the fold: LCP must not
									     wait on a lazy image. -->
									<img
										src={post.headerImage}
										alt={post.headerImageAlt}
										width={cover?.width}
										height={cover?.height}
										loading={i === 0 ? 'eager' : 'lazy'}
										fetchpriority={i === 0 ? 'high' : undefined}
										decoding="async"
										class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
								</div>
							{/if}
							<div class="p-6">
								<div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
									<span class="rounded-full bg-accent/10 px-3 py-1 text-accent">
										{post.category}
									</span>
									<span class="text-muted">{formatDate(post.date)}</span>
								</div>
								<h2 class="mb-2 text-2xl font-semibold transition-colors group-hover:text-accent">
									{post.title}
								</h2>
								<p class="mb-4 text-muted">{post.excerpt}</p>
								<div class="flex flex-wrap gap-2">
									{#each post.tags as tag}
										<span
											class="rounded-full border border-line-soft px-2 py-0.5 text-xs text-muted"
										>
											#{tag}
										</span>
									{/each}
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="py-16 text-center">
					<svg class="mx-auto mb-4 h-16 w-16 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<p class="text-lg text-muted">
						{#if searchQuery.trim()}
							No posts match “{searchQuery.trim()}”
						{:else}
							No posts found
						{/if}
					</p>
					<button class="mt-4 text-accent underline transition-opacity hover:opacity-80" onclick={clearAllFilters}>
						Clear filters
					</button>
				</div>
			{/if}

			<!-- Back to home -->
			<div class="mt-16 text-center">
				<a href="/" class="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
					</svg>
					Back to home
				</a>
			</div>
		</div>

		<!-- Sidebar -->
		<aside class="w-full lg:w-64 shrink-0">
			<div class="sticky top-24 space-y-8">
				<!-- Categories -->
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Categories</h3>
					<div class="flex flex-wrap gap-2">
						{#each categories as cat}
							<button
								onclick={() => toggleCategory(cat)}
								class="rounded-full px-3 py-1 text-sm transition-all {selectedCategory === cat
									? 'bg-accent text-accent-ink'
									: 'bg-card text-fg hover:bg-hover'}"
							>
								{cat}
							</button>
						{/each}
					</div>
				</div>

				<!-- Tags -->
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Tags</h3>
					<div class="flex flex-wrap gap-2">
						{#each allTags as tag}
							<button
								onclick={() => toggleTag(tag)}
								class="rounded-full border px-3 py-1 text-sm transition-all {selectedTag === tag
									? 'border-accent bg-accent/10 text-accent'
									: 'border-line text-fg hover:border-accent'}"
							>
								#{tag}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</aside>
	</div>
</div>
