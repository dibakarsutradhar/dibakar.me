import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { getAllPosts } from '$lib/blog';

export const prerender = true;

// Generate static entries for all blog posts
export const entries: EntryGenerator = async () => {
	const posts = await getAllPosts();
	return posts.map((post) => ({ slug: post.slug }));
};

// Load all blog posts and find the one matching the slug
const modules = import.meta.glob('/src/lib/blog/posts/*.svx');

export const load: PageLoad = async ({ params }) => {
	const path = `/src/lib/blog/posts/${params.slug}.svx`;
	const loader = modules[path];

	if (!loader) {
		error(404, 'Post not found');
	}

	const post = await loader() as { default: unknown; metadata: Record<string, unknown> };

	return {
		content: post.default,
		metadata: post.metadata,
		slug: params.slug
	};
};