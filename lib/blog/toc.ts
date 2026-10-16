/**
 * Table of contents extraction from rendered post HTML.
 *
 * Heading ids come from rehypeSlug in the markdown pipeline; here we pull the
 * h2/h3 elements back out of that HTML string so the page can hand a flat
 * items list to the client-side TableOfContents component.
 */

export interface TocItem {
	id: string;
	text: string;
	level: 2 | 3;
}

const HEADING_RE = /<h([23])[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g;

export function extractHeadings(html: string): TocItem[] {
	const items: TocItem[] = [];

	for (const [, level, id, inner] of html.matchAll(HEADING_RE)) {
		const text = inner.replace(/<[^>]+>/g, '').trim();
		if (!text) continue;
		items.push({ id, text, level: Number(level) as 2 | 3 });
	}

	return items;
}
