import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { rehypePictures } from './src/lib/blog/rehype-pictures.js';

const config = {
	extensions: ['.svelte', '.md', '.svx'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md', '.svx'],
			// Upgrades markdown images into captioned figures and galleries.
			rehypePlugins: [rehypePictures]
		})
	],
	kit: {
		adapter: adapter({
			// optional: you can set your output directory
			pages: 'build',
			assets: 'build',
			// Must NOT be index.html: that would overwrite the prerendered home
			// page with an empty SPA shell. GitHub Pages serves 404.html for
			// unknown routes, so this still works as the client-side fallback.
			fallback: '404.html',
			precompress: false
		}),
		prerender: {
			entries: ['*'],
			handleHttpError: 'warn'
		}
	}
};

export default config;
