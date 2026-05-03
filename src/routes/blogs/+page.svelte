<script lang="ts">
	import type { PageData } from './$types';
	import { searchPosts } from '$lib/blog';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let searchQuery = $state('');
	let selectedCategory = $state<string | null>(null);
	let selectedTag = $state<string | null>(null);

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
</svelte:head>

<div class="mx-auto max-w-7xl px-6 py-16">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Blog</h1>
		<p class="text-lg opacity-70">Thoughts on software engineering, web3, and web development.</p>
	</div>

	<div class="flex flex-col gap-12 lg:flex-row">
		<!-- Main Content -->
		<div class="flex-1">
			<!-- Search -->
			<div class="mb-8">
				<div class="relative">
					<svg
						class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
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
						class="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-12 py-3 backdrop-blur-sm transition-all focus:border-[#ffcfa0] focus:outline-none"
						bind:value={searchQuery}
					/>
					{#if searchQuery || selectedCategory || selectedTag}
						<button
							class="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 transition-opacity hover:opacity-100"
							onclick={clearAllFilters}
							aria-label="Clear all filters"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
							class="flex items-center gap-1 rounded-full bg-[#ffcfa0]/10 px-3 py-1 text-sm text-[#ffcfa0] transition-colors hover:bg-[#ffcfa0]/20"
						>
							{selectedCategory}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
					{#if selectedTag}
						<button
							onclick={() => toggleTag(selectedTag!)}
							class="flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.2)] px-3 py-1 text-sm transition-colors hover:border-[#ffcfa0]"
						>
							#{selectedTag}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<!-- Posts Grid -->
			{#if filteredPosts().length > 0}
				<div class="grid gap-8">
					{#each filteredPosts() as post (post.slug)}
						<a
							href="/blogs/{post.slug}"
							class="group block overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] transition-all hover:border-[rgba(255,207,160,0.3)] hover:bg-[rgba(255,255,255,0.05)]"
						>
							{#if post.headerImage}
								<div class="aspect-video overflow-hidden">
									<img
										src={post.headerImage}
										alt={post.title}
										class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
								</div>
							{/if}
							<div class="p-6">
								<div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
									<span class="rounded-full bg-[#ffcfa0]/10 px-3 py-1 text-[#ffcfa0]">
										{post.category}
									</span>
									<span class="opacity-50">{formatDate(post.date)}</span>
								</div>
								<h2 class="mb-2 text-2xl font-semibold transition-colors group-hover:text-[#ffcfa0]">
									{post.title}
								</h2>
								<p class="mb-4 opacity-70">{post.excerpt}</p>
								<div class="flex flex-wrap gap-2">
									{#each post.tags as tag}
										<span
											class="rounded-full border border-[rgba(255,255,255,0.1)] px-2 py-0.5 text-xs opacity-60"
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
					<svg class="mx-auto mb-4 h-16 w-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<p class="text-lg opacity-60">No posts found</p>
					<button class="mt-4 text-[#ffcfa0] underline transition-opacity hover:opacity-80" onclick={clearAllFilters}>
						Clear filters
					</button>
				</div>
			{/if}

			<!-- Back to home -->
			<div class="mt-16 text-center">
				<a href="/" class="inline-flex items-center gap-2 opacity-60 transition-opacity hover:opacity-100">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider opacity-60">Categories</h3>
					<div class="flex flex-wrap gap-2">
						{#each categories as cat}
							<button
								onclick={() => toggleCategory(cat)}
								class="rounded-full px-3 py-1 text-sm transition-all {selectedCategory === cat
									? 'bg-[#ffcfa0] text-[#0f1419]'
									: 'bg-[rgba(255,255,255,0.05)] opacity-70 hover:opacity-100 hover:bg-[rgba(255,255,255,0.1)]'}"
							>
								{cat}
							</button>
						{/each}
					</div>
				</div>

				<!-- Tags -->
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider opacity-60">Tags</h3>
					<div class="flex flex-wrap gap-2">
						{#each allTags as tag}
							<button
								onclick={() => toggleTag(tag)}
								class="rounded-full border px-3 py-1 text-sm transition-all {selectedTag === tag
									? 'border-[#ffcfa0] bg-[#ffcfa0]/10 text-[#ffcfa0]'
									: 'border-[rgba(255,255,255,0.1)] opacity-60 hover:opacity-100 hover:border-[rgba(255,255,255,0.3)]'}"
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