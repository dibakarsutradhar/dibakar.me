'use client';

import { useEffect } from 'react';

/**
 * Client-side renderer for mermaid diagrams in post bodies.
 *
 * The markdown pipeline (rehype-mermaid.js) turns ```mermaid fences into
 * `<pre class="mermaid">` placeholders whose text is the diagram source —
 * readable as-is if JavaScript never runs. This component, rendered once per
 * post page, lazily imports mermaid (~1 MB, only paid on posts that actually
 * have diagrams) and upgrades each placeholder into an inline SVG.
 *
 * Each rendered SVG is wrapped in an `a[data-zoomable]` link to the serialized
 * SVG itself, so the diagram joins the same lightbox flow BlogLightbox runs
 * for pictures: click to view full size, Esc to close, arrows to move between
 * diagrams and images.
 *
 * Theme follows the site's `data-theme` attribute on <html>; when the reader
 * flips the palette the diagrams re-render in the matching mermaid theme.
 */

const SELECTOR = 'pre.mermaid, div.mermaid';

type Mermaid = typeof import('mermaid').default;

async function renderAll(mermaid: Mermaid) {
	const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
	if (nodes.length === 0) return;

	// Keep the original source on the node: mermaid replaces the contents with
	// SVG, and we need it back for a palette switch or a failed render.
	for (const node of nodes) {
		node.dataset.mermaidSource ??= node.textContent ?? '';
		node.removeAttribute('data-processed');
		node.textContent = node.dataset.mermaidSource;
	}

	mermaid.initialize({
		startOnLoad: false,
		suppressErrorRendering: true,
		theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default',
		fontFamily: 'inherit'
	});

	try {
		await mermaid.run({ nodes });
	} catch {
		// A diagram that fails to parse stays as its readable source.
		for (const node of nodes) {
			node.textContent = node.dataset.mermaidSource ?? '';
		}
		return;
	}

	// Make each diagram zoomable. The link href is the serialized SVG, the
	// same trick the image pipeline uses with a full-size file, so
	// BlogLightbox can show it in its viewer without knowing about SVG.
	for (const node of nodes) {
		const svg = node.querySelector('svg');
		if (!svg || svg.closest('a[data-zoomable]')) continue;

		// Mermaid sizes the inline SVG with width="100%" and a max-width style;
		// as a standalone image that collapses to the 300px default. Stamping
		// the viewBox dimensions on gives the lightbox a real intrinsic size to
		// scale down to the viewport.
		const copy = svg.cloneNode(true) as SVGSVGElement;
		const viewBox = copy.viewBox.baseVal;
		if (viewBox.width && viewBox.height) {
			copy.setAttribute('width', String(viewBox.width));
			copy.setAttribute('height', String(viewBox.height));
		}

		const link = document.createElement('a');
		link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
			new XMLSerializer().serializeToString(copy)
		)}`;
		link.target = '_blank';
		link.rel = 'noopener';
		link.className = 'blog-diagram__zoom';
		link.setAttribute('data-zoomable', 'true');
		link.setAttribute('aria-label', 'View the diagram full size');
		svg.replaceWith(link);
		link.appendChild(svg);
	}
}

export default function MermaidRenderer() {
	useEffect(() => {
		let cancelled = false;
		let observer: MutationObserver | undefined;

		async function start() {
			if (!document.querySelector(SELECTOR)) return;

			const { default: mermaid } = await import('mermaid');
			if (cancelled) return;

			await renderAll(mermaid);

			observer = new MutationObserver(() => {
				void renderAll(mermaid);
			});
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['data-theme']
			});
		}

		void start();

		return () => {
			cancelled = true;
			observer?.disconnect();
		};
	}, []);

	return null;
}
