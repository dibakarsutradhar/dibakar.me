/**
 * Markdown → HTML for post bodies.
 *
 * mdsvex rendered post bodies in the SvelteKit version; this is the Next.js
 * equivalent: a unified pipeline ending in an HTML string that the post page
 * injects. Posts are plain markdown (no JSX components), so a string pipeline
 * keeps the port faithful.
 *
 * rehypePictures is the same plugin mdsvex ran — it upgrades markdown images
 * into captioned figures, galleries, and zoom links (see rehype-pictures.js).
 */
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { rehypePictures } from './rehype-pictures.js';

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	// Hand-written HTML in a post passes through to the output.
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypePictures)
	.use(rehypeStringify);

/** Compiles a post's markdown body into an HTML string. */
export async function renderPostHtml(markdown: string): Promise<string> {
	return String(await processor.process(markdown));
}
