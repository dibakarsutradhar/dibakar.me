/**
 * Generates small web-optimized logo derivatives for the partners marquee.
 *
 * The source assets in src/lib/assets are up to 2000x2000 PNG/SVG; the
 * marquee renders them at ~94px. Without this, every visitor downloads
 * megapixel images for thumbnails (a Lighthouse "image delivery" failure).
 * Run once via `pnpm logos`; the output is committed with the site.
 */
import sharp from 'sharp';
import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const SRC = 'src/lib/assets';
const OUT = 'static/images/logos';
const SIZE = 192; // 2x the largest rendered size (96px tile), crisp on retina

await mkdir(OUT, { recursive: true });

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp|tiff?|svg)$/i.test(f));

for (const file of files) {
	const name = basename(file, extname(file))
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-');
	const out = join(OUT, `${name}.webp`);

	// SVGs are already resolution-independent: copy through unchanged.
	if (/\.svg$/i.test(file)) {
		await copyFile(join(SRC, file), join(OUT, `${name}.svg`));
		console.log(`${file} -> ${name}.svg (copied, vector)`);
		continue;
	}

	try {
		await sharp(join(SRC, file))
			// Square canvas: the <img> declares width/height 128x128, so the
			// intrinsic aspect ratio must match (transparent padding is fine).
			.resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.webp({ quality: 85 })
			.toFile(out);
		console.log(`${file} -> ${out}`);
	} catch {
		// e.g. yieldfinder.png is actually a .ico, which sharp cannot read.
		// Copy it through: browsers render ico in <img> and it is tiny.
		await copyFile(join(SRC, file), join(OUT, `${name}.ico`));
		console.log(`${file} -> ${name}.ico (copied, unsupported format)`);
	}
}
console.log(`done: ${files.length} logos`);
