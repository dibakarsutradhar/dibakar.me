import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Fully static output in out/ — deployable to GitHub Pages and anywhere
	// else that serves files. not-found.tsx becomes out/404.html, which GitHub
	// Pages serves for unknown routes.
	output: 'export',
	// Static export has no image optimizer; the blog pipeline already emits
	// intrinsic width/height attributes, so nothing is lost.
	images: { unoptimized: true },
	// out/blog/index.html and out/blog/<slug>/index.html — directory URLs work
	// on GitHub Pages (and it redirects extensionless requests to these anyway).
	trailingSlash: true
};

export default nextConfig;
