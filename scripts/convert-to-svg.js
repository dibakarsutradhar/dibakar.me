#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const ASSETS_DIR = './src/lib/assets';
const OUTPUT_DIR = './src/lib/assets/svg';

// Ensure output directory exists
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const images = [
  'devsonket.png',
  'dosier.png', 
  'invoicelab.png',
  'mc2finance.png',
  'qdacademy.png',
  'signupcash.png'
];

console.log('🖼️  Converting PNG images to optimized formats...\n');

for (const imageName of images) {
  const inputPath = path.join(ASSETS_DIR, imageName);
  const baseName = path.parse(imageName).name;
  
  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`📊 ${imageName}:`);
    console.log(`   Dimensions: ${metadata.width}×${metadata.height}`);
    console.log(`   Format: ${metadata.format}`);
    console.log(`   Channels: ${metadata.channels}`);
    console.log(`   Size: ${(await fs.stat(inputPath)).size} bytes`);
    
    // Create high-quality PNG (for manual SVG conversion)
    const highQualityPath = path.join(OUTPUT_DIR, `${baseName}-hq.png`);
    await sharp(inputPath)
      .resize(metadata.width * 2, metadata.height * 2, { 
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(highQualityPath);
    
    // Create standardized sizes for web use
    const sizes = [32, 64, 128, 256, 512];
    for (const size of sizes) {
      const outputPath = path.join(OUTPUT_DIR, `${baseName}-${size}.png`);
      await sharp(inputPath)
        .resize(size, size, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 95 })
        .toFile(outputPath);
    }
    
    console.log(`   ✅ Created high-quality and standardized versions\n`);
    
  } catch (error) {
    console.error(`   ❌ Error processing ${imageName}:`, error.message);
  }
}

console.log('🎯 Next steps:');
console.log('1. Review the high-quality PNGs in src/lib/assets/svg/');
console.log('2. Use AI vectorization tools for complex logos:');
console.log('   - Vectorizer.io (free tier available)');
console.log('   - Adobe Illustrator AI');
console.log('   - Inkscape (free)');
console.log('3. For simple logos, use online PNG-to-SVG converters');
console.log('4. Manual recreation in Figma/Illustrator for best results');
