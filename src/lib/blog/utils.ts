import type { BlogFrontmatter, BlogMeta } from './types';

/** Turns a `.../posts/my-post.svx` path into the post's slug. */
export function getSlugFromPath(path: string): string {
	// Remove the extension (.svx) and any path prefix
	const fileName = path.split('/').pop() || '';
	// Remove .svx extension to get the slug
	return fileName.replace(/\.svx$/, '');
}

/** Fills in the defaults for a post's frontmatter. */
export function normalizePostMeta(
	slug: string,
	metadata: BlogFrontmatter,
	searchText = ''
): BlogMeta {
	return {
		slug,
		title: metadata.title || '',
		category: metadata.category || 'uncategorized',
		tags: metadata.tags || [],
		headerImage: metadata.headerImage || '',
		// Covers sit next to the post title, so the title is a reasonable default
		// alt until an author writes a better one.
		headerImageAlt: metadata.headerImageAlt || metadata.title || '',
		headerImageCaption: metadata.headerImageCaption || '',
		date: metadata.date || '',
		excerpt: metadata.excerpt || '',
		searchText
	};
}

// Format date for display
export function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/**
 * Where a term was found decides how well a post ranks. A title match should
 * beat a match buried in the body of a longer article.
 */
const FIELD_WEIGHTS = { title: 5, tags: 3, category: 3, excerpt: 2, searchText: 1 };

function searchFields(post: BlogMeta) {
	return [
		[FIELD_WEIGHTS.title, post.title],
		[FIELD_WEIGHTS.tags, post.tags.join(' ')],
		[FIELD_WEIGHTS.category, post.category],
		[FIELD_WEIGHTS.excerpt, post.excerpt],
		[FIELD_WEIGHTS.searchText, post.searchText]
	] as const;
}

/**
 * Every whitespace-separated term must appear somewhere in the post, in any
 * order: "security web3" finds the same post as "web3 security". Matching is
 * case-insensitive substring, so partial words work while typing.
 */
export function searchPosts(posts: BlogMeta[], query: string): BlogMeta[] {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return posts;

	const scored: Array<{ post: BlogMeta; score: number }> = [];

	for (const post of posts) {
		const fields = searchFields(post).map(
			([weight, value]) => [weight, value.toLowerCase()] as const
		);
		let score = 0;

		for (const term of terms) {
			let best = 0;
			for (const [weight, value] of fields) {
				if (weight > best && value.includes(term)) best = weight;
			}
			// A missing term disqualifies the post: all terms must match.
			if (best === 0) {
				score = 0;
				break;
			}
			score += best;
		}

		if (score > 0) scored.push({ post, score });
	}

	// Sort is stable, so equally relevant posts keep their date order.
	return scored.sort((a, b) => b.score - a.score).map((entry) => entry.post);
}
