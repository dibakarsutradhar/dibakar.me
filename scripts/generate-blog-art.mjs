/**
 * Generates the placeholder artwork used by the blog: one cover per post plus a
 * few inline diagrams. Everything is drawn as SVG and rasterised with sharp, so
 * the output is deterministic and can be regenerated at any time:
 *
 *   node scripts/generate-blog-art.mjs
 *
 * Replace the files in static/images/blog/ with real screenshots or photos when
 * you have them; only the filenames matter to the posts.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/images/blog');

const BG = '#0f1419';
const BG_2 = '#131c26';
const INK = '#e4e6eb';
const MUTED = '#8b95a1';
const ACCENT = '#ffcfa0';
const ACCENT_2 = '#5eead4';
const FONT = "'Space Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";

const escapeXml = (value) =>
	String(value).replace(
		/[&<>"']/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]
	);

/** Greedy word wrap for SVG text, which has no automatic wrapping. */
function wrap(text, maxChars) {
	const lines = [];
	let line = '';
	for (const word of String(text).split(/\s+/)) {
		if (!line) line = word;
		else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
		else {
			lines.push(line);
			line = word;
		}
	}
	if (line) lines.push(line);
	return lines;
}

function backdrop(w, h) {
	return `
		<defs>
			<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
				<path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
			</pattern>
		</defs>
		<rect width="${w}" height="${h}" fill="${BG}"/>
		<rect width="${w}" height="${h}" fill="url(#grid)"/>`;
}

function coverSvg({ title, category, width = 1600, height = 900, seed = 0 }) {
	const lines = wrap(title, 26);
	const size = lines.length > 2 ? 66 : 78;
	const startY = height / 2 - ((lines.length - 1) * size * 1.14) / 2 + size / 3;
	const dots = Array.from({ length: 5 }, (_, i) => {
		const x = 96 + i * 26;
		return `<circle cx="${x}" cy="${height - 108}" r="4" fill="${ACCENT}" fill-opacity="${0.2 + i * 0.05}"/>`;
	}).join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
		${backdrop(width, height)}
		<circle cx="${width - 190 + seed * 12}" cy="${230 - seed * 8}" r="132" fill="none" stroke="${ACCENT}" stroke-opacity="0.28" stroke-width="1.5"/>
		<circle cx="${width - 190 + seed * 12}" cy="${230 - seed * 8}" r="86" fill="none" stroke="${ACCENT}" stroke-opacity="0.18" stroke-width="1.5"/>
		<text x="96" y="196" font-family="${FONT}" font-size="26" font-weight="600" letter-spacing="6" fill="${ACCENT}">${escapeXml(String(category).toUpperCase())}</text>
		<rect x="96" y="232" width="72" height="4" rx="2" fill="${ACCENT}"/>
		${lines
			.map(
				(line, i) =>
					`<text x="96" y="${startY + i * size * 1.14 + 60}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${INK}">${escapeXml(line)}</text>`
			)
			.join('\n\t\t')}
		<text x="96" y="${height - 96}" font-family="${FONT}" font-size="24" fill="${MUTED}">dibakar.me</text>
		${dots}
	</svg>`;
}

/**
 * A labelled flow of rounded boxes with arrows, laid out in a row (or a 2x2
 * grid when there are more than three steps).
 */
function diagramSvg({ title, steps, width = 1600, height = 1000, accent = ACCENT }) {
	const pad = 110;
	const perRow = steps.length > 3 ? 2 : steps.length;
	const rows = Math.ceil(steps.length / perRow);
	const boxW = Math.min(560, (width - pad * 2 - (perRow - 1) * 70) / perRow);
	const boxH = 132;
	const gapX = perRow > 1 ? (width - pad * 2 - boxW * perRow) / (perRow - 1) : 0;
	const gridH = rows * boxH + (rows - 1) * 96;
	const top = (height - gridH) / 2 + 44;

	const boxes = steps
		.map((step, i) => {
			const row = Math.floor(i / perRow);
			const col = i % perRow;
			const x = pad + col * (boxW + gapX);
			const y = top + row * (boxH + 96);
			const label = wrap(step.label, Math.floor(boxW / 13)).slice(0, 2);
			const detail = step.detail ? wrap(step.detail, Math.floor(boxW / 8.4))[0] : '';
			const sameRow = col < perRow - 1 && i < steps.length - 1;
			const arrow = sameRow
				? `<path d="M${x + boxW + 14} ${y + boxH / 2}H${x + boxW + gapX - 14}" stroke="${accent}" stroke-opacity="0.55" stroke-width="2.5" marker-end="url(#arrow)"/>`
				: '';
			return `${arrow}
			<g>
				<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="20" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.09"/>
				<rect x="${x}" y="${y}" width="6" height="${boxH}" rx="3" fill="${accent}" fill-opacity="0.85"/>
				<text x="${x + 36}" y="${y + (label.length > 1 ? 56 : 70)}" font-family="${FONT}" font-size="30" font-weight="600" fill="${INK}">${escapeXml(label[0] ?? '')}</text>
				${label[1] ? `<text x="${x + 36}" y="${y + 94}" font-family="${FONT}" font-size="30" font-weight="600" fill="${INK}">${escapeXml(label[1])}</text>` : ''}
				${detail ? `<text x="${x + 36}" y="${y + boxH - 22}" font-family="${FONT}" font-size="21" fill="${MUTED}">${escapeXml(detail)}</text>` : ''}
			</g>`;
		})
		.join('\n\t\t');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
		<defs>
			<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
				<path d="M0 0L10 5L0 10z" fill="${accent}" fill-opacity="0.75"/>
			</marker>
		</defs>
		${backdrop(width, height)}
		<text x="${pad}" y="${top - 104}" font-family="${FONT}" font-size="44" font-weight="700" fill="${INK}">${escapeXml(title)}</text>
		<rect x="${pad}" y="${top - 74}" width="64" height="4" rx="2" fill="${accent}"/>
		${boxes}
	</svg>`;
}

/**
 * The social share card (og:image) for the homepage, /about, /projects and
 * the blog index: 1200×630, the ratio every platform crops cleanly. PNG on
 * purpose — some scrapers still mishandle WebP.
 */
function ogCardSvg({ width = 1200, height = 630 } = {}) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
		${backdrop(width, height)}
		<circle cx="${width - 150}" cy="130" r="96" fill="none" stroke="${ACCENT}" stroke-opacity="0.28" stroke-width="1.5"/>
		<circle cx="${width - 150}" cy="130" r="62" fill="none" stroke="${ACCENT}" stroke-opacity="0.18" stroke-width="1.5"/>
		<text x="96" y="250" font-family="${FONT}" font-size="76" font-weight="700" fill="${INK}">Dibakar Sutra Dhar</text>
		<rect x="96" y="292" width="72" height="4" rx="2" fill="${ACCENT}"/>
		<text x="96" y="360" font-family="${FONT}" font-size="34" fill="${MUTED}">senior software engineer — web platforms &amp; web3 security</text>
		<text x="96" y="${height - 96}" font-family="${FONT}" font-size="26" fill="${MUTED}">dibakar.me</text>
		${Array.from({ length: 5 }, (_, i) => `<circle cx="${96 + i * 26}" cy="${height - 150}" r="4" fill="${ACCENT}" fill-opacity="${0.2 + i * 0.05}"/>`).join('')}
	</svg>`;
}

const covers = [
	{
		file: 'cover-sveltekit.jpg',
		svg: coverSvg({ title: 'Getting Started with SvelteKit', category: 'tutorial', seed: 0 })
	},
	{
		file: 'cover-portfolio.jpg',
		svg: coverSvg({ title: 'Building a Modern Portfolio Website', category: 'project', seed: 1 })
	},
	{
		file: 'cover-web3-security.jpg',
		svg: coverSvg({ title: 'Web3 Security Best Practices', category: 'security', seed: 2 })
	},
	{
		file: 'cover-doc-scraper.jpg',
		svg: coverSvg({ title: 'Exporting GitBook Docs as Clean Markdown', category: 'project', seed: 3 })
	}
];

const diagrams = [
	{
		file: 'diagram-sveltekit-routing.png',
		svg: diagramSvg({
			title: 'File-based routing',
			steps: [
				{ label: 'src/routes', detail: 'the only place routes live' },
				{ label: '+page.svelte', detail: 'renders that URL' },
				{ label: '+page.server.ts', detail: 'loads data on the server' }
			]
		})
	},
	{
		file: 'diagram-sveltekit-data.png',
		svg: diagramSvg({
			title: 'How a page gets its data',
			accent: ACCENT_2,
			steps: [
				{ label: 'Request', detail: 'browser asks for /blog' },
				{ label: 'load()', detail: 'runs on the server first' },
				{ label: 'Svelte render', detail: 'HTML is generated' },
				{ label: 'Hydrate', detail: 'the page becomes interactive' }
			]
		})
	},
	{
		file: 'diagram-portfolio-layout.png',
		svg: diagramSvg({
			title: 'Portfolio page anatomy',
			steps: [
				{ label: 'Hero', detail: 'who you are, in one screen' },
				{ label: 'Work', detail: 'proof, not adjectives' },
				{ label: 'Writing', detail: 'how you think' },
				{ label: 'Contact', detail: 'one obvious next step' }
			]
		})
	},
	{
		file: 'diagram-portfolio-theme.png',
		svg: diagramSvg({
			title: 'One palette, two themes',
			accent: ACCENT_2,
			steps: [
				{ label: 'Design tokens', detail: 'CSS custom properties' },
				{ label: 'Dark + light', detail: 'same markup, swapped values' },
				{ label: 'System default', detail: 'respect prefers-color-scheme' }
			]
		})
	},
	{
		file: 'diagram-web3-lifecycle.png',
		svg: diagramSvg({
			title: 'A contract that can hold value',
			steps: [
				{ label: 'Threat model', detail: 'what is worth stealing?' },
				{ label: 'Tests + invariants', detail: 'fuzzing beats happy paths' },
				{ label: 'Independent audit', detail: 'fresh eyes, paid to find bugs' },
				{ label: 'Bug bounty', detail: 'security work never ends' }
			]
		})
	},
	{
		file: 'diagram-web3-checklist.png',
		svg: diagramSvg({
			title: 'Before you deploy',
			accent: ACCENT_2,
			steps: [
				{ label: 'Access control', detail: 'who can call what?' },
				{ label: 'External calls', detail: 'reentrancy and oracles' },
				{ label: 'Arithmetic', detail: 'rounding always favours someone' }
			]
		})
	},
	{
		file: 'diagram-doc-scraper-pipeline.png',
		svg: diagramSvg({
			title: 'One request per page, no HTML parsing',
			steps: [
				{ label: 'sitemap.xml', detail: 'every published page' },
				{ label: 'GET /page.md', detail: 'the hidden markdown endpoint' },
				{ label: 'Soft-404 check', detail: 'content-based, not status codes' },
				{ label: 'Mirror tree', detail: '+ llms.txt, AGENTS.md sidecars' }
			]
		})
	}
];

await mkdir(join(outDir, 'diagrams'), { recursive: true });

// Social share card — lives outside /images/blog since every page references it.
await sharp(Buffer.from(ogCardSvg()))
	.png()
	.toFile(join(root, 'public/images/og-card.png'));
console.log('og-card ', join('public/images/og-card.png'));

for (const { file, svg } of covers) {
	await sharp(Buffer.from(svg))
		.webp({ quality: 82 })
		.toFile(join(outDir, file.replace(/\.jpe?g$/, '.webp')));
	console.log('cover  ', join('static/images/blog', file.replace(/\.jpe?g$/, '.webp')));
}

for (const { file, svg } of diagrams) {
	await sharp(Buffer.from(svg))
		// WebP: the diagrams contain soft gradients, which palette PNG
		// quantizes badly (bigger than raw PNG). WebP keeps them small.
		.webp({ quality: 82 })
		.toFile(join(outDir, 'diagrams', file.replace(/\.png$/, '.webp')));
	console.log('diagram', join('static/images/blog/diagrams', file.replace(/\.png$/, '.webp')));
}

console.log(`\nWrote ${covers.length + diagrams.length} images to static/images/blog/`);
console.log('Next: node scripts/generate-image-manifest.mjs');
