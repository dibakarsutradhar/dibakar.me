import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// optional: you can set your output directory
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // important for SPAs
			precompress: false
		}),
		prerender: {
			entries: ['*'] // prerender all routes
		}
	}
};

export default config;
