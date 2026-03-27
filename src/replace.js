#!/usr/bin/env node
/**
 * Replace image and video URLs in source files:
 *   - External URLs → /images/name.webp (or /videos/name.webm)
 *   - Local .png/.jpg/.jpeg → .webp
 *   - Local .mp4/.mov/.avi/.mkv/.m4v → .webm
 *
 * Run from project root: npx img-opt replace
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';
import { walkDir } from './lib/walk-dir.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function webPath(dir) {
  const raw = dir.replace(/\\/g, '/').replace(/\/+$/, '');
  return '/' + (raw.replace(/^public\/?/, '') || 'images');
}

async function main() {
  const { config, projectRoot } = await getConfig();
  const imagesDir = path.join(projectRoot, config.imagesDir);
  const videosDir = path.join(projectRoot, config.videosDir);
  const imagesDirWeb = webPath(config.imagesDir);
  const videosDirWeb = webPath(config.videosDir);

  const replacements = [];

  // ── Image source URL replacements ──────────────────────────────────
  for (const { url, file } of config.sources || []) {
    const base = path.basename(file, path.extname(file));
    replacements.push({ from: url, to: `${imagesDirWeb}/${base}.webp` });
  }

  // ── Local image extension replacements (.png/.jpg → .webp) ─────────
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

  // ── Video source URL replacements ──────────────────────────────────
  for (const { url, file } of config.videoSources || []) {
    const base = path.basename(file, path.extname(file));
    replacements.push({ from: url, to: `${videosDirWeb}/${base}.webm` });
  }

  // ── Local video extension replacements (.mp4/.mov → .webm) ─────────
  const webmBases = new Set();
  if (fs.existsSync(videosDir)) {
    for (const f of fs.readdirSync(videosDir)) {
      if (f.toLowerCase().endsWith('.webm')) {
        webmBases.add(path.basename(f, '.webm'));
      }
    }
  }
  for (const base of webmBases) {
    for (const ext of ['.mp4', '.mov', '.avi', '.mkv', '.m4v']) {
      replacements.push({ from: `${videosDirWeb}/${base}${ext}`, to: `${videosDirWeb}/${base}.webm` });
    }
  }

  // ── Scan files and apply replacements ──────────────────────────────
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
