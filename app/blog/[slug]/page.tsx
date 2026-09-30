import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogLightbox from '@/components/blog/BlogLightbox';
import { renderPostHtml } from '@/lib/blog/markdown';
import { getPost, getAllPosts } from '@/lib/blog/posts';
import { getImageMeta } from '@/lib/blog/image-manifest.js';
import { formatDate } from '@/lib/blog/utils';
import { SITE_TITLE, SITE_URL } from '@/lib/site';

interface Props {
	params: Promise<{ slug: string }>;
}

/** Every post is prerendered at build time (static export). */
export function generateStaticParams() {
	return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) return {};

	return {
		title: post.title,
		description: post.excerpt,
		alternates: { canonical: `/blog/${post.slug}` },
		openGraph: {
			type: 'article',
			url: `/blog/${post.slug}`,
			title: post.title,
			description: post.excerpt,
			...(post.headerImage && { images: [{ url: post.headerImage }] })
		},
		twitter: { card: post.headerImage ? 'summary_large_image' : 'summary' }
	};
}

export default async function PostPage({ params }: Props) {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) notFound();

	const html = await renderPostHtml(post.content);
	const cover = getImageMeta(post.headerImage);

	return (
		<>
			<article className="mx-auto max-w-3xl px-6 py-16">
				{/* Back link */}
				<Link
					href="/blog"
					className="mb-8 inline-flex items-center gap-2 text-muted transition-colors hover:text-fg"
				>
					<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to blog
				</Link>

				{/* Header */}
				<header className="mb-12">
					<div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
						<span className="rounded-full bg-accent/10 px-3 py-1 text-accent">{post.category}</span>
						<span className="text-muted">{formatDate(post.date)}</span>
					</div>

					<h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight md:text-5xl">
						{post.title}
					</h1>

					<p className="text-xl text-muted">{post.excerpt}</p>

					<div className="mt-6 flex flex-wrap gap-2">
						{post.tags.map((tag) => (
							<span key={tag} className="rounded-full border border-line-soft px-3 py-1 text-sm text-muted">
								#{tag}
							</span>
						))}
					</div>
				</header>

				{/* Cover image: the one image above the fold, so load it eagerly and
				    at a higher priority than the body images. */}
				{post.headerImage && (
					<figure className="blog-figure mb-12">
						<a
							href={post.headerImage}
							target="_blank"
							rel="noopener"
							className="blog-image__zoom"
							data-zoomable="true"
							aria-label="View the cover image full size"
						>
							<img
								src={post.headerImage}
								alt={post.headerImageAlt}
								className="blog-image"
								width={cover?.width}
								height={cover?.height}
								loading="eager"
								fetchPriority="high"
								decoding="async"
							/>
						</a>
						{post.headerImageCaption && (
							<figcaption className="blog-figure__caption">{post.headerImageCaption}</figcaption>
						)}
					</figure>
				)}

				{/* Content — rendered HTML from the markdown pipeline. */}
				<div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

				{/* Footer */}
				<footer className="mt-16 border-t border-line-soft pt-8">
					<div className="flex items-center justify-between">
						<div className="flex flex-wrap gap-2">
							{post.tags.map((tag) => (
								<span key={tag} className="rounded-full border border-line-soft px-3 py-1 text-sm text-muted">
									#{tag}
								</span>
							))}
						</div>
						<Link href="/blog" className="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg">
							All posts
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
							</svg>
						</Link>
					</div>
				</footer>
			</article>

			<BlogLightbox />

			{/* Hidden at runtime; present so crawlers see structured article data. */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'BlogPosting',
						headline: post.title,
						description: post.excerpt,
						datePublished: post.date,
						author: { '@type': 'Person', name: SITE_TITLE, url: SITE_URL },
						mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
						...(post.headerImage && { image: `${SITE_URL}${post.headerImage}` })
					})
				}}
			/>
		</>
	);
}
