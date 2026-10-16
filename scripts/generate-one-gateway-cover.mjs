/**
 * One-off cover for the "One Gateway, One Eval" post, in the same house style
 * as scripts/generate-pulsar-cover.mjs: SVG drawn by hand, rasterised with
 * sharp.
 *
 *   node scripts/generate-one-gateway-cover.mjs
 *
 * The motif is the article's argument: every feature workload flows through a
 * single shared gateway transport on the left's behalf, while the evaluation
 * loop turns model selection into a per-variant route table.
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

const WORKLOADS = ['Extraction', 'Synthesis', 'Chat', 'Re-rank'];
const WL_X = 880;
const WL_W = 170;
const WL_H = 50;
const WL_STEP = 90;
const WL_TOP = 210;

const GW_X = 1120;
const GW_W = 190;
const GW_H = 76;

const PV_X = 1370;
const PV_W = 170;
const PV_H = 76;

const ROW_X = 880;
const ROW_W = 170;
const ROW_H = 46;
const ROW_TOP = 640;
const ROW_STEP = 72;

function node(x, y, w, h, text, color, sub) {
	return `
		<g>
			<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.12"/>
			<rect x="${x}" y="${y}" width="4" height="${h}" rx="2" fill="${color}" fill-opacity="0.85"/>
			${sub
				? `<text x="${x + w / 2 + 2}" y="${y + h / 2 + 2}" font-family="${FONT}" font-size="21" font-weight="600" fill="${INK}" text-anchor="middle">${text}</text>
			<text x="${x + w / 2 + 2}" y="${y + h / 2 + 26}" font-family="${FONT}" font-size="15" fill="${MUTED}" text-anchor="middle">${sub}</text>`
				: `<text x="${x + w / 2 + 2}" y="${y + h / 2 + 8}" font-family="${FONT}" font-size="21" font-weight="600" fill="${INK}" text-anchor="middle">${text}</text>`}
		</g>`;
}

const workloadSvgs = WORKLOADS.map((label, i) => {
	const y = WL_TOP + i * WL_STEP;
	const midY = y + WL_H / 2;
	// Every workload elbows into the same gateway point.
	const gwMidY = WL_TOP + (WORKLOADS.length - 1) * WL_STEP / 2 + WL_H / 2;
	const arrow = `<path d="M${WL_X + WL_W + 10} ${midY} C1060 ${midY} 1060 ${gwMidY} ${GW_X - 10} ${gwMidY}" fill="none" stroke="${ACCENT}" stroke-opacity="0.5" stroke-width="2" marker-end="url(#arrow)"/>`;
	return `
		${node(WL_X, y, WL_W, WL_H, label, ACCENT)}
		${arrow}`;
}).join('\n');

const gatewayMidY = WL_TOP + (WORKLOADS.length - 1) * WL_STEP / 2 + WL_H / 2;
const gateway = node(GW_X, gatewayMidY - GW_H / 2, GW_W, GW_H, 'AI Gateway', ACCENT_2, 'one transport');
const providers = node(PV_X, gatewayMidY - PV_H / 2, PV_W, PV_H, 'Providers', ACCENT_2);
const gwToPv = `<path d="M${GW_X + GW_W + 10} ${gatewayMidY}H${PV_X - 12}" stroke="${ACCENT_2}" stroke-opacity="0.6" stroke-width="2.5" marker-end="url(#arrow)"/>`;

const routeRows = [
	{ left: 'Articles', right: 'Model A', color: ACCENT_2 },
	{ left: 'Transcripts', right: 'Model B', color: ACCENT_2 }
]
	.map(({ left, right, color }, i) => {
		const y = ROW_TOP + i * ROW_STEP;
		const arrow = `<path d="M${ROW_X + ROW_W + 10} ${y + ROW_H / 2}H${PV_X - 12}" fill="none" stroke="${color}" stroke-opacity="0.55" stroke-width="2" marker-end="url(#arrow)"/>`;
		return `
		${node(ROW_X, y, ROW_W, ROW_H, left, color)}
		${arrow}
		${node(PV_X, y, PV_W, ROW_H, right, color)}`;
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
	<text x="96" y="462" font-family="${FONT}" font-size="92" font-weight="700" fill="${INK}">One Gateway,</text>
	<text x="96" y="572" font-family="${FONT}" font-size="92" font-weight="700" fill="${INK}">One Eval</text>
	<text x="96" y="646" font-family="${FONT}" font-size="31" fill="${MUTED}">The LLM workflow layer of a news-intelligence platform</text>
	<text x="${WL_X}" y="${WL_TOP - 20}" font-family="${FONT}" font-size="18" font-weight="600" letter-spacing="3" fill="${ACCENT}" fill-opacity="0.9">EVERY WORKLOAD</text>
	<text x="${GW_X}" y="${WL_TOP - 20}" font-family="${FONT}" font-size="18" font-weight="600" letter-spacing="3" fill="${ACCENT_2}" fill-opacity="0.9">ONE GATEWAY</text>
	${workloadSvgs}
	${gateway}
	${gwToPv}
	${providers}
	<text x="${WL_X}" y="${ROW_TOP - 26}" font-family="${FONT}" font-size="18" font-weight="600" letter-spacing="3" fill="${ACCENT_2}" fill-opacity="0.9">ONE EVAL → ROUTES BY VARIANT</text>
	${routeRows}
	<text x="96" y="${H - 96}" font-family="${FONT}" font-size="24" fill="${MUTED}">dibakar.me</text>
	${Array.from({ length: 5 }, (_, i) => `<circle cx="${96 + i * 26}" cy="${H - 136}" r="4" fill="${ACCENT}" fill-opacity="${0.2 + i * 0.05}"/>`).join('')}
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(join(outDir, 'cover-one-gateway-one-eval.webp'));
console.log('cover  ', join('public/images/blog/system-design/cover-one-gateway-one-eval.webp'));
