/**
 * mdsvex rehype plugin: rich picture support for blog posts.
 *
 * Authors write ordinary markdown; this plugin upgrades it at build time:
 *
 *   ![Alt](/images/blog/x.jpg "A caption")
 *     → <figure> with a <figcaption>, lazy loading, and intrinsic width/height
 *
 *   ![Alt](/images/blog/x.jpg "A caption | wide")     // also: half, full
 *     → same, plus a size class handled in blog-images.css
 *
 *   ![One](/images/blog/1.jpg "First")
 *   ![Two](/images/blog/2.jpg "Two")                  // no blank line between
 *     → a two-up gallery grid of captioned tiles
 *
 * Every figure image is wrapped in a link to the full-size file: that is the
 * keyboard-accessible zoom trigger BlogLightbox.svelte intercepts, and without
 * JavaScript the image still opens, in a new tab. Images already wrapped in an
 * author's link are left alone so their destination keeps working.
 *
 * Hand-written HTML in a post (<figure>, <div class="gallery">) passes through
 * mdsvex untouched, so it keeps working but gets none of the upgrades above —
 * blog-images.css still styles it. Prefer the markdown forms.
 */
import { getImageMeta } from './image-manifest.js';

const SIZE_CLASSES = {
	wide: 'blog-figure--wide',
	half: 'blog-figure--half',
	full: 'blog-figure--full'
};

const isElement = (node, tagName) => node?.type === 'element' && node.tagName === tagName;
const isIgnorable = (node) =>
	node?.type === 'comment' || (node?.type === 'text' && node.value.trim() === '');

const element = (tagName, properties, children) => ({
	type: 'element',
	tagName,
	properties,
	children
});

function classList(node) {
	const value = node?.properties?.className;
	if (!value) return [];
	return Array.isArray(value) ? value.map(String) : String(value).split(/\s+/);
}

/**
 * Splits a markdown image title into caption text and an optional size marker:
 * "A caption | wide" → { caption: "A caption", size: "wide" }.
 */
function parseTitle(title) {
	const text = typeof title === 'string' ? title : '';
	const match = /^([\s\S]*?)\s*\|\s*([a-z]+)$/.exec(text);
	if (!match || !(match[2] in SIZE_CLASSES)) return { caption: text.trim(), size: null };
	return { caption: match[1].trim(), size: match[2] };
}

/**
 * Adds the attributes every blog image needs. When `consumeCaption` is true the
 * title becomes a caption and is removed from the image so the browser does not
 * also show it as a tooltip.
 */
function enhanceImage(img, { consumeCaption = false } = {}) {
	const properties = (img.properties ??= {});
	const { caption, size } = parseTitle(properties.title);

	if (consumeCaption && (caption || size)) delete properties.title;

	properties.loading = 'lazy';
	properties.decoding = 'async';
	properties.className = [...new Set([...classList(img), 'blog-image'])];

	const meta = getImageMeta(properties.src);
	if (meta) {
		// Width/height let the browser reserve space before the file arrives.
		properties.width = meta.width;
		properties.height = meta.height;
	}

	return { caption, size };
}

/**
 * Wraps a figure's image in a link to the full-size file. `host` is what the
 * author wrote: either the image itself or a link around it.
 *
 * The link opens in a new tab on purpose. BlogLightbox.svelte intercepts the
 * click once the page is interactive, but if the click lands before the client
 * app is ready (or JavaScript never runs), the browser follows the link — and a
 * same-tab navigation would replace the article with a bare image file, which
 * looks like a dead end. A new tab keeps the post where it was.
 */
function withZoom(host, img) {
	if (host !== img) return host; // the author's own link wins
	return element(
		'a',
		{
			href: img.properties.src,
			target: '_blank',
			rel: ['noopener'],
			className: ['blog-image__zoom'],
			'data-zoomable': 'true'
		},
		[img]
	);
}

/** Wraps an image (or the link around it) in a captioned <figure>. */
function toFigure(host, img) {
	const { caption, size } = enhanceImage(img, { consumeCaption: true });

	const className = ['blog-figure', ...(size ? [SIZE_CLASSES[size]] : [])];
	const children = [withZoom(host, img)];

	if (caption) {
		children.push(
			element('figcaption', { className: ['blog-figure__caption'] }, [
				{ type: 'text', value: caption }
			])
		);
	}

	return element('figure', { className }, children);
}

/** Returns the image inside a paragraph child, if that child is image-bearing. */
function imageHost(child) {
	if (isElement(child, 'img')) return child;
	if (isElement(child, 'a')) {
		const images = child.children.filter((node) => isElement(node, 'img'));
		const onlyImages = child.children.every((node) => isElement(node, 'img') || isIgnorable(node));
		if (images.length === 1 && onlyImages) return images[0];
	}
	return null;
}

/** Wraps a markdown paragraph whose only content is images. */
function rewriteParagraph(paragraph) {
	const children = paragraph.children.filter((node) => !isIgnorable(node));
	const images = children.map(imageHost);
	if (images.length === 0 || images.some((img) => img === null)) return null;

	const figures = images.map((img, index) => toFigure(children[index], img));
	if (figures.length === 1) return figures[0];

	const className = ['blog-gallery'];
	if (figures.length <= 4) className.push(`blog-gallery--${figures.length}`);
	return element('div', { className }, figures);
}

function walk(node) {
	if (!node.children) return;

	node.children = node.children.map((child) => {
		if (isElement(child, 'p')) {
			const rewritten = rewriteParagraph(child);
			if (rewritten) return rewritten;
			walk(child);
			return child;
		}

		if (isElement(child, 'img')) {
			// Inline image, e.g. mixed into a sentence: enhance but do not caption.
			enhanceImage(child);
			return child;
		}

		const img = isElement(child, 'a') && imageHost(child);
		if (img) {
			enhanceImage(img);
			return child;
		}

		walk(child);
		return child;
	});
}

export function rehypePictures() {
	return (tree) => {
		walk(tree);
	};
}

export default rehypePictures;
