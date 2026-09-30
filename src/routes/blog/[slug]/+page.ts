import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { getSlugFromPath, normalizePostMeta } from '$lib/blog';
import type { BlogFrontmatter } from '$lib/blog';

export const prerender = true;

// One lazy glob serves both jobs below: enumerating the static entries at build
// time, and loading the matching post's component on demand. Importing the posts
// eagerly here would pull every post into the client bundle.
const modules = import.meta.glob<{ default: unknown; metadata: BlogFrontmatter }>(
	'/src/lib/blog/posts/*.svx'
);

// Generate static entries for all blog posts
export const entries: EntryGenerator = () =>
	Object.keys(modules).map((path) => ({ slug: getSlugFromPath(path) }));

export const load: PageLoad = async ({ params }) => {
	const loader = modules[`/src/lib/blog/posts/${params.slug}.svx`];

	if (!loader) {
		error(404, 'Post not found');
	}

	const post = await loader();

	return {
		content: post.default,
		// Normalised so cover alt/caption defaults match the blog index.
		metadata: normalizePostMeta(params.slug, post.metadata),
		slug: params.slug
	};
};
