#!/usr/bin/env node
/**
 * Replace image and video URLs in source files:
 *   - External URLs → /images/name.webp (or /videos/name.webm)
 *   - Local .png/.jpg/.jpeg → .webp  (both in imagesDir and in-place local assets)
 *   - Local .mp4/.mov/.avi/.mkv/.m4v → .webm
 *
 * Run from project root: npx img-opt replace
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';
import { walkDir } from './lib/walk-dir.js';
import { buildIgnoreFilter } from './lib/ignore.js';

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
  const shouldIgnore = buildIgnoreFilter(config.ignore);

  const replacements = [];

  // ── Image source URL replacements ──────────────────────────────────
  for (const { url, file } of config.sources || []) {
    if (shouldIgnore(url)) continue;
    const base = path.basename(file, path.extname(file));
    replacements.push({ from: url, to: `${imagesDirWeb}/${base}.webp` });
  }

  // ── Local image extension replacements in imagesDir (.png/.jpg → .webp)
  const webpBases = new Set();
  if (fs.existsSync(imagesDir)) {
    for (const f of fs.readdirSync(imagesDir)) {
      if (f.toLowerCase().endsWith('.webp')) {
        webpBases.add(path.basename(f, '.webp'));
      }
    }
  }
  for (const base of webpBases) {
    if (shouldIgnore(base)) continue;
    replacements.push({ from: `${imagesDirWeb}/${base}.png`, to: `${imagesDirWeb}/${base}.webp` });
    replacements.push({ from: `${imagesDirWeb}/${base}.jpg`, to: `${imagesDirWeb}/${base}.webp` });
    replacements.push({ from: `${imagesDirWeb}/${base}.jpeg`, to: `${imagesDirWeb}/${base}.webp` });
  }

  // ── In-place local image replacements (compressLocal) ──────────────
  // Find .webp files across the project that have no .png/.jpg sibling
  // (meaning the original was compressed and removed)
  if (config.compressLocal) {
    const scanDirs = [...new Set([...(config.replaceInDirs || ['src']), 'public'])];
    const webpFiles = [];
    for (const d of scanDirs) {
      walkDir(path.join(projectRoot, d), ['.webp'], webpFiles);
    }
    for (const webpPath of webpFiles) {
      // Skip files in imagesDir (already handled above)
      if (webpPath.startsWith(imagesDir + path.sep) || webpPath.startsWith(imagesDir + '/')) continue;

      const dir = path.dirname(webpPath);
      const base = path.basename(webpPath, '.webp');
      const relDir = path.relative(projectRoot, dir).replace(/\\/g, '/');
      // Build relative web paths for this location
      const localWebBase = '/' + (relDir.replace(/^public\/?/, '') || '');
      const prefix = localWebBase === '/' ? '/' : localWebBase + '/';

      for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.bmp']) {
        const oldRef = `${prefix}${base}${ext}`;
        const newRef = `${prefix}${base}.webp`;
        if (oldRef !== newRef && !shouldIgnore(oldRef)) {
          replacements.push({ from: oldRef, to: newRef });
        }
      }
      // Also handle relative paths without leading slash (e.g. ./assets/hero.png)
      for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.bmp']) {
        const oldRef = `./${relDir}/${base}${ext}`;
        const newRef = `./${relDir}/${base}.webp`;
        if (oldRef !== newRef && !shouldIgnore(oldRef)) {
          replacements.push({ from: oldRef, to: newRef });
        }
      }
    }
  }

  // ── Video source URL replacements ──────────────────────────────────
  for (const { url, file } of config.videoSources || []) {
    if (shouldIgnore(url)) continue;
    const base = path.basename(file, path.extname(file));
    replacements.push({ from: url, to: `${videosDirWeb}/${base}.webm` });
  }

  // ── Local video extension replacements in videosDir (.mp4/.mov → .webm)
  const webmBases = new Set();
  if (fs.existsSync(videosDir)) {
    for (const f of fs.readdirSync(videosDir)) {
      if (f.toLowerCase().endsWith('.webm')) {
        webmBases.add(path.basename(f, '.webm'));
      }
    }
  }
  for (const base of webmBases) {
    if (shouldIgnore(base)) continue;
    for (const ext of ['.mp4', '.mov', '.avi', '.mkv', '.m4v']) {
      replacements.push({ from: `${videosDirWeb}/${base}${ext}`, to: `${videosDirWeb}/${base}.webm` });
    }
  }

  // ── In-place local video replacements (compressLocal) ──────────────
  if (config.compressLocal) {
    const scanDirs = [...new Set([...(config.replaceInDirs || ['src']), 'public'])];
    const webmFiles = [];
    for (const d of scanDirs) {
      walkDir(path.join(projectRoot, d), ['.webm'], webmFiles);
    }
    for (const webmPath of webmFiles) {
      if (webmPath.startsWith(videosDir + path.sep) || webmPath.startsWith(videosDir + '/')) continue;

      const dir = path.dirname(webmPath);
      const base = path.basename(webmPath, '.webm');
      const relDir = path.relative(projectRoot, dir).replace(/\\/g, '/');
      const localWebBase = '/' + (relDir.replace(/^public\/?/, '') || '');
      const prefix = localWebBase === '/' ? '/' : localWebBase + '/';

      for (const ext of ['.mp4', '.mov', '.avi', '.mkv', '.m4v']) {
        const oldRef = `${prefix}${base}${ext}`;
        const newRef = `${prefix}${base}.webm`;
        if (oldRef !== newRef && !shouldIgnore(oldRef)) {
          replacements.push({ from: oldRef, to: newRef });
        }
      }
      for (const ext of ['.mp4', '.mov', '.avi', '.mkv', '.m4v']) {
        const oldRef = `./${relDir}/${base}${ext}`;
        const newRef = `./${relDir}/${base}.webm`;
        if (oldRef !== newRef && !shouldIgnore(oldRef)) {
          replacements.push({ from: oldRef, to: newRef });
        }
      }
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
