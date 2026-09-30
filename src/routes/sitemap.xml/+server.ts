import { getAllPosts } from '$lib/blog/posts.server';
import type { RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

const SITE_URL = 'https://dibakar.me';

function urlEntry(path: string, lastmod?: string): string {
	return `  <url>
    <loc>${SITE_URL}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
}

export const GET: RequestHandler = async () => {
	const posts = await getAllPosts();
	// Posts are listed newest-first; only dates (no times) are known.
	const latest = posts[0]?.date ? new Date(posts[0].date).toISOString().split('T')[0] : undefined;

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntry('/', latest)}
${urlEntry('/blog', latest)}
${posts.map((post) => urlEntry(`/blog/${post.slug}`, post.date ? new Date(post.date).toISOString().split('T')[0] : undefined)).join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
};
