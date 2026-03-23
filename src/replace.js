#!/usr/bin/env node
/**
 * Replace image URLs in source files: external URLs -> /images/name.webp, and
 * existing /images/name.png|.jpg|.jpeg -> /images/name.webp so all pages use compressed assets.
 * Run from project root: node scripts/replace-image-urls.js
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';

function walkDir(dir, exts, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, exts, files);
    } else if (exts.some((ext) => e.name.toLowerCase().endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const { config, projectRoot } = await getConfig();
  const imagesDir = path.join(projectRoot, config.imagesDir);
  const rawDir = config.imagesDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const imagesDirWeb = '/' + (rawDir.replace(/^public\/?/, '') || 'images');

  const replacements = [];

  for (const { url, file } of config.sources || []) {
    const base = path.basename(file, path.extname(file));
    const webPath = `${imagesDirWeb}/${base}.webp`;
    replacements.push({ from: url, to: webPath });
  }

  const webpBases = new Set();
  if (fs.existsSync(imagesDir)) {
    for (const f of fs.readdirSync(imagesDir)) {
      if (f.toLowerCase().endsWith('.webp')) {
        webpBases.add(path.basename(f, '.webp'));
      }
    }
  }
  for (const base of webpBases) {
    replacements.push({ from: `${imagesDirWeb}/${base}.png`, to: `${imagesDirWeb}/${base}.webp` });
    replacements.push({ from: `${imagesDirWeb}/${base}.jpg`, to: `${imagesDirWeb}/${base}.webp` });
    replacements.push({ from: `${imagesDirWeb}/${base}.jpeg`, to: `${imagesDirWeb}/${base}.webp` });
  }

  const exts = config.replaceExtensions || ['.js', '.jsx', '.ts', '.tsx', '.html', '.vue', '.svelte', '.md', '.mdx'];
  const dirs = (config.replaceInDirs || ['src']).map((d) => path.join(projectRoot, d));
  const allFiles = [];
  for (const d of dirs) {
    walkDir(d, exts, allFiles);
  }

  let totalReplaced = 0;
  for (const filePath of allFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const { from, to } of replacements) {
      if (from === to) continue;
      const count = (content.match(new RegExp(escapeRegex(from), 'g')) || []).length;
      if (count) {
        content = content.split(from).join(to);
        changed = true;
        totalReplaced += count;
      }
    }
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Updated:', path.relative(projectRoot, filePath));
    }
  }
  console.log(`\nDone. Replaced ${totalReplaced} URL(s) across ${allFiles.length} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
