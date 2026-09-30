import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';

/** Static-exported to out/sitemap.xml. */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
	const posts = getAllPosts();
	// Posts are listed newest-first; only dates (no times) are known.
	const latest = posts[0]?.date
		? new Date(posts[0].date).toISOString().split('T')[0]
		: undefined;

	return [
		{ url: SITE_URL, lastModified: latest },
		{ url: `${SITE_URL}/blog`, lastModified: latest },
		...posts.map((post) => ({
			url: `${SITE_URL}/blog/${post.slug}`,
			lastModified: post.date ? new Date(post.date) : undefined
		}))
	];
}
