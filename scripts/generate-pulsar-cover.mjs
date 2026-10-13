/**
 * One-off cover for the "From Pulsar to Workers" post, in the same house
 * style as scripts/generate-blog-art.mjs: SVG drawn by hand, rasterised
 * with sharp.
 *
 *   node scripts/generate-pulsar-cover.mjs
 *
 * The motif is the article's argument: three pipeline generations, each one
 * ending at the same Postgres cylinder — the data model that survived every
 * rewrite.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/images/blog/system-design');

const BG = '#0f1419';
const INK = '#e4e6eb';
const MUTED = '#8b95a1';
const ACCENT = '#ffcfa0';
const ACCENT_2 = '#5eead4';
const FONT = "'Space Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";

const W = 1600;
const H = 900;

const lanes = [
	{ label: 'GEN 1 · PULSAR + FLINK', nodes: ['Pulsar', 'Flink'], color: ACCENT },
	{ label: 'GEN 2 · RUST ON ECS', nodes: ['Pulsar', 'Rust'], color: ACCENT },
	{ label: 'GEN 3 · WORKERS + QUEUES', nodes: ['Workers', 'Queues'], color: ACCENT_2 }
];

const LANE_X = 952;
const NODE_W = 148;
const NODE_H = 54;
const GAP = 40;
const PG_W = 150;
const PG_H = 58;
const LANE_TOP = 232;
const LANE_STEP = 156;

function node(x, y, text, color) {
	return `
		<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.12"/>
		<rect x="${x}" y="${y}" width="4" height="${NODE_H}" rx="2" fill="${color}" fill-opacity="0.85"/>
		<text x="${x + NODE_W / 2 + 2}" y="${y + NODE_H / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}" text-anchor="middle">${text}</text>`;
}

/** Small database cylinder, identical in every lane: the stable data model. */
function postgres(x, y) {
	const ry = 14;
	return `
		<g stroke="#ffffff" stroke-opacity="0.22" fill="#ffffff" fill-opacity="0.05">
			<path d="M${x} ${y + ry} a${PG_W / 2} ${ry} 0 0 0 ${PG_W} 0 V${y + PG_H - ry} a${PG_W / 2} ${ry} 0 0 1 -${PG_W} 0 Z"/>
			<ellipse cx="${x + PG_W / 2}" cy="${y + ry}" rx="${PG_W / 2}" ry="${ry}"/>
		</g>
		<text x="${x + PG_W / 2}" y="${y + PG_H / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}" text-anchor="middle">Postgres</text>`;
}

const laneSvgs = lanes
	.map(({ label, nodes, color }, i) => {
		const y = LANE_TOP + i * LANE_STEP;
		const first = node(LANE_X, y, nodes[0], color);
		const secondX = LANE_X + NODE_W + GAP;
		const second = node(secondX, y, nodes[1], color);
		const pgX = secondX + NODE_W + GAP;
		// All three lanes end at the same cylinder.
		const pgY = y + (NODE_H - PG_H) / 2;
		const arrow = (x1, x2) =>
			`<path d="M${x1} ${y + NODE_H / 2}H${x2}" stroke="${color}" stroke-opacity="0.5" stroke-width="2" marker-end="url(#arrow)"/>`;
		return `
		<text x="${LANE_X}" y="${y - 16}" font-family="${FONT}" font-size="18" font-weight="600" letter-spacing="3" fill="${color}" fill-opacity="0.9">${label}</text>
		${first}
		${arrow(LANE_X + NODE_W + 10, secondX - 10)}
		${second}
		${arrow(secondX + NODE_W + 10, pgX - 12)}
		${postgres(pgX, pgY)}`;
	})
	.join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<defs>
		<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
			<path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
		</pattern>
		<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
			<path d="M0 0L10 5L0 10z" fill="${ACCENT}" fill-opacity="0.7"/>
		</marker>
	</defs>
	<rect width="${W}" height="${H}" fill="${BG}"/>
	<rect width="${W}" height="${H}" fill="url(#grid)"/>
	<circle cx="1500" cy="70" r="132" fill="none" stroke="${ACCENT}" stroke-opacity="0.22" stroke-width="1.5"/>
	<circle cx="1500" cy="70" r="86" fill="none" stroke="${ACCENT}" stroke-opacity="0.14" stroke-width="1.5"/>
	<text x="96" y="196" font-family="${FONT}" font-size="26" font-weight="600" letter-spacing="6" fill="${ACCENT}">SYSTEM DESIGN</text>
	<rect x="96" y="232" width="72" height="4" rx="2" fill="${ACCENT}"/>
	<text x="96" y="462" font-family="${FONT}" font-size="92" font-weight="700" fill="${INK}">From Pulsar</text>
	<text x="96" y="572" font-family="${FONT}" font-size="92" font-weight="700" fill="${INK}">to Workers</text>
	<text x="96" y="646" font-family="${FONT}" font-size="31" fill="${MUTED}">Three generations of a DeFi data pipeline</text>
	${laneSvgs}
	<text x="96" y="${H - 96}" font-family="${FONT}" font-size="24" fill="${MUTED}">dibakar.me</text>
	${Array.from({ length: 5 }, (_, i) => `<circle cx="${96 + i * 26}" cy="${H - 136}" r="4" fill="${ACCENT}" fill-opacity="${0.2 + i * 0.05}"/>`).join('')}
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(join(outDir, 'cover-pulsar-to-workers.webp'));
console.log('cover  ', join('public/images/blog/system-design/cover-pulsar-to-workers.webp'));
