#!/usr/bin/env node
/**
 * Compress images to WebP using Sharp.
 *
 * By default compresses:
 *   1. Downloaded images in imagesDir (public/images/)
 *   2. Local uncompressed images found anywhere in the project (compressLocal: true)
 *
 * Requires: npm add -D sharp
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';
import { walkDir } from './lib/walk-dir.js';
import { buildIgnoreFilter } from './lib/ignore.js';

const IMAGE_EXT = ['.png', '.jpg', '.jpeg'];
const IMAGE_SCAN_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];

/**
 * Find all uncompressed image files in given directories (recursively).
 * Skips files that already have a .webp sibling.
 */
function findLocalImages(dirs, projectRoot) {
  const files = [];
  for (const dir of dirs) {
    const absDir = path.join(projectRoot, dir);
    walkDir(absDir, IMAGE_SCAN_EXT, files);
  }
  // Deduplicate (same file might be in overlapping dirs)
  return [...new Set(files)];
}

async function main() {
  const { config, projectRoot } = await getConfig();
  const imagesDir = path.join(projectRoot, config.imagesDir);
  const compressOpt = config.compress || {};
  const quality = compressOpt.quality ?? 82;
  const removeOriginals = compressOpt.removeOriginals !== false;
  const shouldIgnore = buildIgnoreFilter(config.ignore);

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Sharp not found. Install with: npm add -D sharp');
    process.exit(1);
  }

  // ── 1. Compress downloaded images in imagesDir ────────────────────────
  let downloadedCount = 0;
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    const toCompress = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return IMAGE_EXT.includes(ext) && !shouldIgnore(f) && !shouldIgnore(path.join(imagesDir, f));
    });

    if (toCompress.length) {
      console.log(`Compressing ${toCompress.length} downloaded image(s) in ${config.imagesDir}/\n`);

      for (const file of toCompress) {
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        const inputPath = path.join(imagesDir, file);
        const outputPath = path.join(imagesDir, `${base}.webp`);

        try {
          process.stdout.write(`  ${file} -> ${base}.webp... `);
          await sharp(inputPath).webp({ quality }).toFile(outputPath);
          const outStat = fs.statSync(outputPath);
          if (removeOriginals) fs.unlinkSync(inputPath);
          console.log(`OK (${(outStat.size / 1024).toFixed(1)} KB)`);
          downloadedCount++;
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
        }
      }
    }
  }

  // ── 2. Compress local project images (compressLocal) ──────────────────
  let localCount = 0;
  if (config.compressLocal) {
    // Scan replaceInDirs + public/ for uncompressed images
    const scanDirs = [...new Set([...(config.replaceInDirs || ['src']), 'public'])];
    const localFiles = findLocalImages(scanDirs, projectRoot);

    // Filter out files already in imagesDir (handled above) and ignored files
    const toCompress = localFiles.filter((f) => {
      if (f.startsWith(imagesDir + path.sep) || f.startsWith(imagesDir + '/')) return false;
      const rel = path.relative(projectRoot, f);
      if (shouldIgnore(rel) || shouldIgnore(f)) return false;
      // Skip if a .webp sibling already exists
      const webpSibling = f.replace(/\.[^.]+$/, '.webp');
      if (fs.existsSync(webpSibling)) return false;
      return true;
    });

    if (toCompress.length) {
      console.log(`\nCompressing ${toCompress.length} local image(s) found in project\n`);

      for (const inputPath of toCompress) {
        const ext = path.extname(inputPath);
        const base = path.basename(inputPath, ext);
        const dir = path.dirname(inputPath);
        const outputPath = path.join(dir, `${base}.webp`);
        const relPath = path.relative(projectRoot, inputPath);

        try {
          process.stdout.write(`  ${relPath} -> ${base}.webp... `);
          await sharp(inputPath).webp({ quality }).toFile(outputPath);
          const outStat = fs.statSync(outputPath);
          if (removeOriginals) fs.unlinkSync(inputPath);
          console.log(`OK (${(outStat.size / 1024).toFixed(1)} KB)`);
          localCount++;
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
        }
      }
    }
  }

  const total = downloadedCount + localCount;
  if (total === 0) {
    console.log('No uncompressed PNG/JPG images found.');
  } else {
    console.log(`\nDone. Compressed ${total} image(s) to WebP.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
