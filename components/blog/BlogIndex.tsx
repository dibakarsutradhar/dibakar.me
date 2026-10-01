'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getImageMeta } from '@/lib/blog/image-manifest.js';
import { searchPosts } from '@/lib/blog/utils';
import type { BlogMeta } from '@/lib/blog/types';

/**
 * Search input, sidebar filters, and the post card grid. All client state —
 * the server page hands over the full post list (with searchText) once.
 *
 * Ported from src/routes/blog/+page.svelte.
 */
export default function BlogIndex({ posts }: { posts: BlogMeta[] }) {
	const [query, setQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedTag, setSelectedTag] = useState<string | null>(null);

	const categories = useMemo(() => [...new Set(posts.map((p) => p.category))], [posts]);
	const allTags = useMemo(() => [...new Set(posts.flatMap((p) => p.tags))], [posts]);

	const filteredPosts = useMemo(() => {
		let result = query.trim() ? searchPosts(posts, query) : posts;
		if (selectedCategory) result = result.filter((p) => p.category === selectedCategory);
		if (selectedTag) result = result.filter((p) => p.tags.includes(selectedTag));
		return result;
	}, [posts, query, selectedCategory, selectedTag]);

	function toggleCategory(cat: string) {
		setSelectedCategory((current) => (current === cat ? null : cat));
	}

	function toggleTag(tag: string) {
		setSelectedTag((current) => (current === tag ? null : tag));
	}

	function clearAllFilters() {
		setQuery('');
		setSelectedCategory(null);
		setSelectedTag(null);
	}

	function shortDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	/** Category + tag pickers. Rendered inline on mobile (right after search)
	    and in the desktop sidebar — one source of truth for the buttons. */
	const filterGroups = () => (
		<>
			<div>
				<h3 className="mb-4 text-sm font-semibold tracking-wider text-muted uppercase">
					Categories
				</h3>
				<div className="flex flex-wrap gap-2">
					{categories.map((cat) => (
						<button
							key={cat}
							onClick={() => toggleCategory(cat)}
							className={`rounded-full px-3 py-1 text-sm transition-all ${
								selectedCategory === cat ? 'bg-accent text-accent-ink' : 'bg-card text-fg hover:bg-hover'
							}`}
						>
							{cat}
						</button>
					))}
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-sm font-semibold tracking-wider text-muted uppercase">
					Tags
				</h3>
				<div className="flex flex-wrap gap-2">
					{allTags.map((tag) => (
						<button
							key={tag}
							onClick={() => toggleTag(tag)}
							className={`rounded-full border px-3 py-1 text-sm transition-all ${
								selectedTag === tag ? 'border-accent bg-accent/10 text-accent' : 'border-line text-fg hover:border-accent'
							}`}
						>
							#{tag}
						</button>
					))}
				</div>
			</div>
		</>
	);

	return (
		<div className="flex flex-col gap-12 lg:flex-row">
			{/* Main content */}
			<div className="flex-1">
				{/* Search */}
				<div className="mb-8">
					<div className="relative">
						<svg
							className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<input
							type="text"
							placeholder="Search posts..."
							aria-label="Search posts"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="w-full rounded-lg border border-line bg-card px-12 py-3 text-fg backdrop-blur-sm transition-all placeholder:text-muted focus:border-accent focus:outline-none"
						/>
						{(query || selectedCategory || selectedTag) && (
							<button
								onClick={clearAllFilters}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-fg"
								aria-label="Clear all filters"
							>
								<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						)}
					</div>
				</div>

				{/* Inline filters on mobile — after search, before the posts. */}
				<div className="space-y-8 lg:hidden">{filterGroups()}</div>

				{/* Active filters */}
				{(selectedCategory || selectedTag) && (
					<div className="mb-6 flex flex-wrap gap-2">
						{selectedCategory && (
							<button
								onClick={() => toggleCategory(selectedCategory)}
								className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm text-accent transition-colors hover:bg-accent/20"
							>
								{selectedCategory}
								<svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						)}
						{selectedTag && (
							<button
								onClick={() => toggleTag(selectedTag)}
								className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm text-fg transition-colors hover:border-accent"
							>
								#{selectedTag}
								<svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						)}
					</div>
				)}

				{/* Posts grid */}
				{filteredPosts.length > 0 ? (
					<div className="grid gap-8">
						{filteredPosts.map((post, i) => {
							const cover = getImageMeta(post.headerImage);
							return (
								<Link
									key={post.slug}
									href={`/blog/${post.slug}`}
									className="group block overflow-hidden rounded-xl border border-line-soft bg-card transition-all hover:border-accent/30"
								>
									{post.headerImage && (
										<div className="aspect-video overflow-hidden">
											{/* The newest post's cover is above the fold: LCP
											    must not wait on a lazy image. */}
											<img
												src={post.headerImage}
												alt={post.headerImageAlt}
												width={cover?.width}
												height={cover?.height}
												loading={i === 0 ? 'eager' : 'lazy'}
												fetchPriority={i === 0 ? 'high' : undefined}
												decoding="async"
												className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
											/>
										</div>
									)}
									<div className="p-6">
									<div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
										<span className="rounded-full bg-accent/10 px-3 py-1 text-accent">
											{post.category}
										</span>
										<span className="text-muted">{shortDate(post.date)}</span>
										{post.draft && (
											<span className="rounded-full border border-dashed border-line px-3 py-1 text-muted">
												draft
											</span>
										)}
									</div>
										<h2 className="mb-2 text-2xl font-semibold transition-colors group-hover:text-accent">
											{post.title}
										</h2>
										<p className="mb-4 text-muted">{post.excerpt}</p>
										<div className="flex flex-wrap gap-2">
											{post.tags.map((tag) => (
												<span
													key={tag}
													className="rounded-full border border-line-soft px-2 py-0.5 text-xs text-muted"
												>
													#{tag}
												</span>
											))}
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				) : (
					<div className="py-16 text-center">
						<svg
							className="mx-auto mb-4 h-16 w-16 text-muted"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p className="text-lg text-muted">
							{query.trim() ? `No posts match “${query.trim()}”` : 'No posts found'}
						</p>
						<button
							onClick={clearAllFilters}
							className="mt-4 text-accent underline transition-opacity hover:opacity-80"
						>
							Clear filters
						</button>
					</div>
				)}

				{/* Back to home */}
				<div className="mt-16 text-center">
					<Link href="/" className="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg">
						<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
						</svg>
						Back to home
					</Link>
				</div>
			</div>

			{/* Sidebar (desktop only — mobile uses the inline filter block) */}
			<aside className="hidden w-full shrink-0 lg:block lg:w-64">
				<div className="space-y-8 lg:sticky lg:top-24">{filterGroups()}</div>
			</aside>
		</div>
	);
}
