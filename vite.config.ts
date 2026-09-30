import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		// One CSS bundle instead of one per component: fewer render-blocking
		// requests on the critical path (this is a small single-page site).
		cssCodeSplit: false
	}
});
