#!/usr/bin/env node
/**
 * Compress videos to WebM using ffmpeg.
 *
 * By default compresses:
 *   1. Downloaded videos in videosDir (public/videos/)
 *   2. Local uncompressed videos found anywhere in the project (compressLocal: true)
 *
 * Requires ffmpeg installed on the system:
 *   macOS:  brew install ffmpeg
 *   Ubuntu: sudo apt install ffmpeg
 *   Windows: choco install ffmpeg
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';
import { walkDir } from './lib/walk-dir.js';
import { buildIgnoreFilter } from './lib/ignore.js';

const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.mkv', '.m4v'];
const VIDEO_SCAN_EXT = [...VIDEO_EXT]; // same list for scanning

const QUALITY_PRESETS = {
  fast: { crf: 35, cpuUsed: 4 },
  good: { crf: 28, cpuUsed: 2 },
  best: { crf: 20, cpuUsed: 1 },
};

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

async function compressVideo(inputPath, outputPath, { quality = 'good', maxWidth = 1920 } = {}) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.good;
  const args = [
    '-i', inputPath,
    '-c:v', 'libvpx-vp9',
    '-crf', String(preset.crf),
    '-b:v', '0',
    '-cpu-used', String(preset.cpuUsed),
    '-vf', `scale='min(${maxWidth},iw)':-2`,
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-y',
    outputPath,
  ];
  await runFfmpeg(args);
}

function findLocalVideos(dirs, projectRoot) {
  const files = [];
  for (const dir of dirs) {
    const absDir = path.join(projectRoot, dir);
    walkDir(absDir, VIDEO_SCAN_EXT, files);
  }
  return [...new Set(files)];
}

async function main() {
  const { config, projectRoot } = await getConfig();
  const videosDir = path.join(projectRoot, config.videosDir);
  const videoOpt = config.videoCompress || {};
  const quality = videoOpt.quality ?? 'good';
  const maxWidth = videoOpt.maxWidth ?? 1920;
  const removeOriginals = videoOpt.removeOriginals !== false;
  const shouldIgnore = buildIgnoreFilter(config.ignore);

  if (!checkFfmpeg()) {
    console.error('ffmpeg not found. Install ffmpeg to compress videos:');
    console.error('  macOS:   brew install ffmpeg');
    console.error('  Ubuntu:  sudo apt install ffmpeg');
    console.error('  Windows: choco install ffmpeg');
    process.exit(1);
  }

  // ── 1. Compress downloaded videos in videosDir ────────────────────────
  let downloadedCount = 0;
  if (fs.existsSync(videosDir)) {
    const files = fs.readdirSync(videosDir);
    const toCompress = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return VIDEO_EXT.includes(ext) && !shouldIgnore(f) && !shouldIgnore(path.join(videosDir, f));
    });

    if (toCompress.length) {
      console.log(`Compressing ${toCompress.length} downloaded video(s) in ${config.videosDir}/\n`);

      for (const file of toCompress) {
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        const inputPath = path.join(videosDir, file);
        const outputPath = path.join(videosDir, `${base}.webm`);

        try {
          process.stdout.write(`  ${file} -> ${base}.webm... `);
          await compressVideo(inputPath, outputPath, { quality, maxWidth });
          const outStat = fs.statSync(outputPath);
          const inStat = fs.statSync(inputPath);
          const ratio = ((1 - outStat.size / inStat.size) * 100).toFixed(0);
          if (removeOriginals) fs.unlinkSync(inputPath);
          console.log(`OK (${(outStat.size / 1024 / 1024).toFixed(1)} MB, ${ratio}% smaller)`);
          downloadedCount++;
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
        }
      }
    }
  }

  // ── 2. Compress local project videos (compressLocal) ──────────────────
  let localCount = 0;
  if (config.compressLocal) {
    const scanDirs = [...new Set([...(config.replaceInDirs || ['src']), 'public'])];
    const localFiles = findLocalVideos(scanDirs, projectRoot);

    const toCompress = localFiles.filter((f) => {
      if (f.startsWith(videosDir + path.sep) || f.startsWith(videosDir + '/')) return false;
      const rel = path.relative(projectRoot, f);
      if (shouldIgnore(rel) || shouldIgnore(f)) return false;
      const webmSibling = f.replace(/\.[^.]+$/, '.webm');
      if (fs.existsSync(webmSibling)) return false;
      return true;
    });

    if (toCompress.length) {
      console.log(`\nCompressing ${toCompress.length} local video(s) found in project\n`);

      for (const inputPath of toCompress) {
        const ext = path.extname(inputPath);
        const base = path.basename(inputPath, ext);
        const dir = path.dirname(inputPath);
        const outputPath = path.join(dir, `${base}.webm`);
        const relPath = path.relative(projectRoot, inputPath);

        try {
          process.stdout.write(`  ${relPath} -> ${base}.webm... `);
          await compressVideo(inputPath, outputPath, { quality, maxWidth });
          const outStat = fs.statSync(outputPath);
          const inStat = fs.statSync(inputPath);
          const ratio = ((1 - outStat.size / inStat.size) * 100).toFixed(0);
          if (removeOriginals) fs.unlinkSync(inputPath);
          console.log(`OK (${(outStat.size / 1024 / 1024).toFixed(1)} MB, ${ratio}% smaller)`);
          localCount++;
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
        }
      }
    }
  }

  const total = downloadedCount + localCount;
  if (total === 0) {
    console.log('No compressible video files found (.mp4, .mov, .avi, .mkv, .m4v).');
  } else {
    console.log(`\nDone. Compressed ${total} video(s) to WebM.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
