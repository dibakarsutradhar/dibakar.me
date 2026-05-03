import type { BlogMeta, BlogPost } from './types';

// Types for mdsvex modules
interface MdsvexModule {
	metadata: {
		title: string;
		category: string;
		tags: string[];
		headerImage: string;
		date: string;
		excerpt: string;
	};
	default: unknown;
}

// Helper to extract slug from filename
function getSlugFromPath(path: string): string {
	// Remove the extension (.svx) and any path prefix
	const fileName = path.split('/').pop() || '';
	// Remove .svx extension to get the slug
	return fileName.replace(/\.svx$/, '');
}

// Get all blog posts
export async function getAllPosts(): Promise<BlogMeta[]> {
	const modules = import.meta.glob<MdsvexModule>('/src/lib/blog/posts/*.svx', { eager: true });

	const posts: BlogMeta[] = [];

	for (const path in modules) {
		const module = modules[path];
		const slug = getSlugFromPath(path);

		if (module.metadata) {
			posts.push({
				slug,
				title: module.metadata.title || '',
				category: module.metadata.category || 'uncategorized',
				tags: module.metadata.tags || [],
				headerImage: module.metadata.headerImage || '',
				date: module.metadata.date || '',
				excerpt: module.metadata.excerpt || ''
			});
		}
	}

	// Sort by date descending
	return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get a single post by slug
export async function getPost(slug: string): Promise<BlogPost | null> {
	const modules = import.meta.glob<MdsvexModule>('/src/lib/blog/posts/*.svx', { eager: true });

	for (const path in modules) {
		const fileName = getSlugFromPath(path);

		if (fileName === slug) {
			const module = modules[path];

			if (module.metadata) {
				return {
					slug,
					title: module.metadata.title || '',
					category: module.metadata.category || 'uncategorized',
					tags: module.metadata.tags || [],
					headerImage: module.metadata.headerImage || '',
					date: module.metadata.date || '',
					excerpt: module.metadata.excerpt || '',
					content: '' // Will be rendered by the component
				};
			}
		}
	}

	return null;
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

// Search posts
export function searchPosts(posts: BlogMeta[], query: string): BlogMeta[] {
	const lowerQuery = query.toLowerCase();
	return posts.filter(
		(post) =>
			post.title.toLowerCase().includes(lowerQuery) ||
			post.excerpt.toLowerCase().includes(lowerQuery) ||
			post.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
			post.category.toLowerCase().includes(lowerQuery)
	);
}