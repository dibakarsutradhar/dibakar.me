import type { PageServerLoad } from './$types';
import { getAllPosts } from '$lib/blog/posts.server';

export const prerender = true;

export const load: PageServerLoad = async () => {
	const posts = await getAllPosts();
	return { posts };
};
