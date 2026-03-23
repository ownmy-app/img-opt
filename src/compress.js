#!/usr/bin/env node
/**
 * Compress images in imagesDir to WebP using Sharp. Run from project root: node scripts/compress-images.js
 * Requires: pnpm add -D sharp
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';

const IMAGE_EXT = ['.png', '.jpg', '.jpeg'];

async function main() {
  const { config, projectRoot } = await getConfig();
  const imagesDir = path.join(projectRoot, config.imagesDir);
  const compressOpt = config.compress || {};
  const quality = compressOpt.quality ?? 82;
  const removeOriginals = compressOpt.removeOriginals !== false;

  if (!fs.existsSync(imagesDir)) {
    console.log(`Images dir not found: ${config.imagesDir}. Run download-images.js first.`);
    return;
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Sharp not found. Install with: pnpm add -D sharp');
    process.exit(1);
  }

  const files = fs.readdirSync(imagesDir);
  const toCompress = files.filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()));

  if (!toCompress.length) {
    console.log(`No PNG/JPG images in ${config.imagesDir}.`);
    return;
  }

  for (const file of toCompress) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const inputPath = path.join(imagesDir, file);
    const outputPath = path.join(imagesDir, `${base}.webp`);

    try {
      process.stdout.write(`Compressing ${file} -> ${base}.webp... `);
      await sharp(inputPath)
        .webp({ quality })
        .toFile(outputPath);
      const outStat = fs.statSync(outputPath);
      if (removeOriginals) {
        fs.unlinkSync(inputPath);
      }
      console.log(`OK (${(outStat.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log(`\nDone. WebP files in ${config.imagesDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
