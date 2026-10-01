import Link from 'next/link';
import type { Metadata } from 'next';
import BlogIndex from '@/components/blog/BlogIndex';
import { getAllPosts } from '@/lib/blog/posts';

export const metadata: Metadata = {
	title: 'Blog',
	description: 'Thoughts on software engineering, web3, and web development.',
	alternates: { canonical: '/blog' },
	openGraph: {
		type: 'website',
		url: '/blog',
		title: 'Blog | Dibakar Sutra Dhar',
		description: 'Thoughts on software engineering, web3, and web development.',
		images: ['/images/og-card.png']
	},
	twitter: { card: 'summary_large_image' }
};

export default function BlogPage() {
	// Server-side read at build time; the client filters over the full list.
	const posts = getAllPosts();

	return (
		<div className="mx-auto max-w-7xl px-6 py-16">
			{/* Header */}
			<div className="mb-12 text-center">
				<h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Blog</h1>
				<p className="text-lg text-muted">
					Thoughts on software engineering, web3, and web development.
				</p>
			</div>

			<BlogIndex posts={posts} />
		</div>
	);
}
