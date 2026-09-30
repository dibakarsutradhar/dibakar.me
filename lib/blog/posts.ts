/**
 * Reads the post files.
 *
 * Server-only: this touches the filesystem and imports raw markdown, so only
 * server components may import it. The client gets the stripped-down
 * `searchText` through the props of <BlogIndex /> instead.
 *
 * Posts are `lib/blog/posts/<slug>.mdx` with YAML frontmatter at the top:
 *
 *   ---
 *   title: My post
 *   category: tutorial
 *   tags: [one, two]
 *   headerImage: /images/blog/cover.webp
 *   date: 2026-09-30
 *   excerpt: One sentence summary.
 *   ---
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { BlogFrontmatter, BlogMeta, BlogPost } from './types';
import { getSlugFromPath, normalizePostMeta } from './utils';

const POSTS_DIR = join(process.cwd(), 'lib/blog/posts');

/** A safety valve, not a real limit: whole posts are indexed so search can
 *  find anything a reader remembers. Only a pathologically long post is
 *  truncated. */
const SEARCH_TEXT_MAX = 20000;

/** Reduces a post's markdown source to searchable plain text. */
export function toPlainText(source: string): string {
	return (
		source
			// YAML frontmatter; its fields are indexed separately.
			.replace(/^---[\s\S]*?---/, ' ')
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

interface RawPost {
	slug: string;
	frontmatter: BlogFrontmatter;
	content: string;
}

function readRawPosts(): RawPost[] {
	const posts: RawPost[] = [];

	for (const fileName of readdirSync(POSTS_DIR)) {
		if (!fileName.endsWith('.mdx')) continue;

		const { data, content } = matter(readFileSync(join(POSTS_DIR, fileName), 'utf8'));
		if (!data || Object.keys(data).length === 0) continue;

		posts.push({
			slug: getSlugFromPath(fileName),
			frontmatter: data as BlogFrontmatter,
			content: content.trimStart()
		});
	}

	return posts;
}

const rawPosts = readRawPosts();

/** All posts, newest first, each carrying the plain text used by search. */
export function getAllPosts(): BlogMeta[] {
	return rawPosts
		.map((post) =>
			normalizePostMeta(post.slug, post.frontmatter, toPlainText(post.content))
		)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** A single post's frontmatter and raw markdown body, by slug. */
export function getPost(slug: string): BlogPost | null {
	const post = rawPosts.find((candidate) => candidate.slug === slug);
	if (!post) return null;

	return { ...normalizePostMeta(slug, post.frontmatter), content: post.content };
}
