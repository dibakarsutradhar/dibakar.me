import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

const config = {
	extensions: ['.svelte', '.md', '.svx'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md', '.svx']
		})
	],
	kit: {
		adapter: adapter({
			// optional: you can set your output directory
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // important for SPAs
			precompress: false
		}),
		prerender: {
			entries: ['*'],
			handleHttpError: 'warn'
		}
	}
};

export default config;
