/**
 * Reads the post files.
 *
 * Server-only: this imports the raw markdown of every post, which must not reach
 * the browser. The client gets the stripped-down `searchText` through the page
 * data instead, and SvelteKit fails the build if client code imports this file.
 */
import type { BlogFrontmatter, BlogMeta, BlogPost } from './types';
import { getSlugFromPath, normalizePostMeta } from './utils';

interface MdsvexModule {
	metadata: BlogFrontmatter;
	default: unknown;
}

const postModules = import.meta.glob<MdsvexModule>('/src/lib/blog/posts/*.svx', { eager: true });

// The same posts as raw markdown, for the search index.
const rawPosts = import.meta.glob<string>('/src/lib/blog/posts/*.svx', {
	eager: true,
	query: '?raw',
	import: 'default'
});

/**
 * A safety valve, not a real limit: whole posts are indexed so search can find
 * anything a reader remembers. Only a pathologically long post is truncated.
 */
const SEARCH_TEXT_MAX = 20000;

/** Reduces a .svx file to searchable plain text. */
export function toPlainText(source: string): string {
	return (
		source
			// The frontmatter <script> block; its fields are indexed separately.
			.replace(/<script[\s\S]*?<\/script>/gi, ' ')
			// Keep code, drop the fence markers.
			.replace(/^[ \t]*```.*$/gm, ' ')
			.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			// Heading, quote and list markers.
			.replace(/^[ \t]*(#{1,6}|>|[-*+]|\d+\.)[ \t]+/gm, ' ')
			.replace(/[*_`~|]/g, ' ')
			.replace(/&[a-z]+;/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, SEARCH_TEXT_MAX)
	);
}

/** All posts, newest first, each carrying the plain text used by search. */
export async function getAllPosts(): Promise<BlogMeta[]> {
	const posts: BlogMeta[] = [];

	for (const path in postModules) {
		const module = postModules[path];

		if (module.metadata) {
			posts.push(
				normalizePostMeta(
					getSlugFromPath(path),
					module.metadata,
					toPlainText(rawPosts[path] ?? '')
				)
			);
		}
	}

	return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** A single post's metadata by slug. */
export async function getPost(slug: string): Promise<BlogPost | null> {
	for (const path in postModules) {
		if (getSlugFromPath(path) !== slug) continue;

		const module = postModules[path];
		if (!module.metadata) return null;

		// The body is a component; render it from the route instead of here.
		return { ...normalizePostMeta(slug, module.metadata), content: '' };
	}

	return null;
}
