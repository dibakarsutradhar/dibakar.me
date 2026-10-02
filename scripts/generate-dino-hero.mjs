/**
 * Generates the theme-matched hero GIFs from the source dino capture
 * (public/images/dino.gif):
 *
 *   bun run dino
 *
 * → public/images/dino-light.gif (dark ink on paper, for light theme)
 * → public/images/dino-dark.gif  (light ink on night sky, for dark theme)
 *
 * Per frame: luminance-based palette swap into the site's theme tokens, a
 * pterodactyl crossing the sky on a two-frame wing cycle, and — in the dark
 * variant only — a crescent moon with twinkling stars. The whole loop is
 * slowed ~33% (30ms → 40ms per frame) for a calmer feel.
 *
 * gifenc (dev dependency) encodes; sharp reads the source frames.
 */
import sharp from 'sharp';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'public/images/dino.gif');
const FRAME_DELAY_MS = 60; // source is 30ms — slowed 2× for a calm, readable loop
const PTERO_SPEED_PX = 12; // per frame, right → left

const THEMES = {
	light: { bg: [240, 240, 240], ink: [26, 26, 26], cloud: [166, 173, 186], night: false },
	dark: { bg: [15, 20, 25], ink: [228, 230, 235], cloud: [70, 82, 95], night: true }
};

function readSourceDelays() {
	const buf = readFileSync(SRC);
	const delays = [];
	for (let i = 0; i < buf.length - 4; i++) {
		if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) {
			delays.push((buf[i + 4] | (buf[i + 5] << 8)) * 10);
			i += 7;
		}
	}
	return delays;
}

async function readFrames() {
	const meta = await sharp(SRC).metadata();
	const frames = [];
	// `page` is 0-based; `pages: 1` extracts exactly that frame (libvips'
	// `pages: N` alone would stack the first N frames into one tall image).
	for (let p = 0; p < meta.pages; p++) {
		const { data, info } = await sharp(SRC, { page: p, pages: 1 })
			.raw()
			.toBuffer({ resolveWithObject: true });
		frames.push({
			data: new Uint8Array(data),
			width: info.width,
			height: info.height,
			channels: info.channels
		});
	}
	return frames;
}

function recolor(frame, { bg, ink, cloud }) {
	const { data, width, height, channels } = frame;
	const out = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		const o = i * channels,
			d = i * 4;
		const lum = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
		// dither the bg/cloud threshold on near-white pixels so flat areas
		// stay flat but large fills get a hint of the checker texture
		const c = lum > 235 ? bg : lum > 170 ? cloud : ink;
		out[d] = c[0];
		out[d + 1] = c[1];
		out[d + 2] = c[2];
		out[d + 3] = 255;
	}
	return { data: out, width, height };
}

function setPx(img, x, y, [r, g, b]) {
	if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
	const d = (y * img.width + x) * 4;
	img.data[d] = r;
	img.data[d + 1] = g;
	img.data[d + 2] = b;
	img.data[d + 3] = 255;
}

/** Filled circle (for the moon). */
function fillCircle(img, cx, cy, r, color) {
	for (let y = cy - r; y <= cy + r; y++)
		for (let x = cx - r; x <= cx + r; x++)
			if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPx(img, x, y, color);
}

/** Pixel-art sprite drawn from a string grid; # = ink, o = optional second color. */
function drawSprite(img, grid, x0, y0, scale, ink) {
	for (let gy = 0; gy < grid.length; gy++)
		for (let gx = 0; gx < grid[gy].length; gx++)
			if (grid[gy][gx] === '#')
				for (let sy = 0; sy < scale; sy++)
					for (let sx = 0; sx < scale; sx++)
						setPx(img, x0 + gx * scale + sx, y0 + gy * scale + sy, ink);
}

const PTERO_UP = [
	'.....###........',
	'.....#####......',
	'.....######.....',
	'....#######.....',
	'...#####.####...',
	'..####....###...',
	'.####......##...',
	'####........#...',
	'###.............'
];
const PTERO_DOWN = [
	'................',
	'................',
	'.....###........',
	'.....#####......',
	'....########....',
	'...#######.##...',
	'..######....#...',
	'.####...........',
	'.###............'
];

function drawPterodactyl(img, frameNo, ink) {
	const cycle = Math.floor(frameNo / 4) % 2; // wing flap every 4 frames
	const progress = ((frameNo - 1) * PTERO_SPEED_PX + 140) % (img.width + 140);
	const x = img.width - progress + 60;
	if (x < -60 || x > img.width) return;
	// flight band sits below the HI score (~y60-90) and above obstacle tops (~y176)
	drawSprite(img, cycle === 0 ? PTERO_UP : PTERO_DOWN, Math.round(x), 108, 3, ink);
}

/** Moon + twinkling stars — dark variant only. */
function drawNightSky(img, frameNo, { bg, ink, cloud }) {
	// crescent: full circle, then bite out an offset circle
	fillCircle(img, 120, 54, 16, ink);
	fillCircle(img, 128, 48, 15, bg);
	// stars: fixed scatter, 3-phase twinkle
	const stars = [
		[210, 40],
		[300, 90],
		[385, 35],
		[455, 75],
		[540, 45],
		[610, 95],
		[660, 30],
		[735, 20],
		[800, 110],
		[840, 40],
		[260, 120],
		[700, 125]
	];
	stars.forEach(([x, y], i) => {
		const phase = (frameNo + i * 3) % 9;
		const c = phase < 3 ? cloud : phase < 6 ? ink : cloud;
		setPx(img, x, y, c);
		setPx(img, x + 1, y, c);
		if (phase >= 6) {
			setPx(img, x, y + 1, c);
			setPx(img, x + 1, y + 1, c);
		}
	});
}

const delaySource = readSourceDelays();
const sourceFrames = await readFrames();
console.log(
	`source: ${sourceFrames.length} frames, ${new Set(delaySource).size} unique delay(s) [${delaySource[0]}ms]`
);

mkdirSync(join(root, 'public/images'), { recursive: true });

for (const [name, theme] of Object.entries(THEMES)) {
	const gif = GIFEncoder();
	let palette = null;

	const processed = sourceFrames.map((frame, i) => {
		const img = recolor(frame, theme);
		drawPterodactyl(img, i + 1, theme.ink);
		if (theme.night) drawNightSky(img, i + 1, theme);
		return img;
	});

	processed.forEach((img, i) => {
		if (!palette) palette = quantize(img.data, 256, { format: 'rgb444' });
		const index = applyPalette(img.data, palette, 'rgb444');
		gif.writeFrame(index, img.width, img.height, {
			palette,
			delay: Math.round((delaySource[i] || 30) * (FRAME_DELAY_MS / 30))
		});
	});

	gif.finish();
	const out = join(root, `public/images/dino-${name}.gif`);
	writeFileSync(out, gif.bytes());
	const kb = Math.round(gif.bytes().length / 1024);
	console.log(`wrote ${out.replace(root + '/', '')} (${kb} KB)`);
}
