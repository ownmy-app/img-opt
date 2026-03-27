#!/usr/bin/env node
/**
 * Compress videos to WebM using ffmpeg. Mirrors compress.js for images.
 * Run from project root: npx img-opt video
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

const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];

const QUALITY_PRESETS = {
  fast: { crf: 35, cpuUsed: 4 },
  good: { crf: 28, cpuUsed: 2 },
  best: { crf: 20, cpuUsed: 1 },
};

/** Check if ffmpeg is available on the system. */
function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Run ffmpeg with given arguments. Returns a promise. */
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

/**
 * Compress a single video to WebM (VP9 + Opus).
 *
 * @param {string} inputPath  - absolute path to source video
 * @param {string} outputPath - absolute path for .webm output
 * @param {Object} options    - { quality, maxWidth }
 */
async function compressVideo(inputPath, outputPath, { quality = 'good', maxWidth = 1920 } = {}) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.good;

  const args = [
    '-i', inputPath,
    '-c:v', 'libvpx-vp9',
    '-crf', String(preset.crf),
    '-b:v', '0',                                          // constant quality mode
    '-cpu-used', String(preset.cpuUsed),
    '-vf', `scale='min(${maxWidth},iw)':-2`,              // scale down if wider
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-y',                                                 // overwrite output
    outputPath,
  ];

  await runFfmpeg(args);
}

async function main() {
  const { config, projectRoot } = await getConfig();
  const videosDir = path.join(projectRoot, config.videosDir);
  const videoOpt = config.videoCompress || {};
  const quality = videoOpt.quality ?? 'good';
  const maxWidth = videoOpt.maxWidth ?? 1920;
  const removeOriginals = videoOpt.removeOriginals !== false;

  if (!fs.existsSync(videosDir)) {
    console.log(`Videos dir not found: ${config.videosDir}. Run download first or create the directory.`);
    return;
  }

  if (!checkFfmpeg()) {
    console.error('ffmpeg not found. Install ffmpeg to compress videos:');
    console.error('  macOS:   brew install ffmpeg');
    console.error('  Ubuntu:  sudo apt install ffmpeg');
    console.error('  Windows: choco install ffmpeg');
    process.exit(1);
  }

  const files = fs.readdirSync(videosDir);
  const toCompress = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    // Skip .webm if we're producing .webm (don't re-compress)
    return VIDEO_EXT.includes(ext) && ext !== '.webm';
  });

  if (!toCompress.length) {
    console.log(`No compressible video files in ${config.videosDir}/ (.mp4, .mov, .avi, .mkv, .m4v).`);
    return;
  }

  console.log(`Compressing ${toCompress.length} video(s) to WebM (quality: ${quality}, max-width: ${maxWidth}px)\n`);

  for (const file of toCompress) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const inputPath = path.join(videosDir, file);
    const outputPath = path.join(videosDir, `${base}.webm`);

    try {
      process.stdout.write(`  Compressing ${file} -> ${base}.webm... `);
      await compressVideo(inputPath, outputPath, { quality, maxWidth });
      const outStat = fs.statSync(outputPath);
      const inStat = fs.statSync(inputPath);
      const ratio = ((1 - outStat.size / inStat.size) * 100).toFixed(0);
      if (removeOriginals) {
        fs.unlinkSync(inputPath);
      }
      console.log(`OK (${(outStat.size / 1024 / 1024).toFixed(1)} MB, ${ratio}% smaller)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log(`\nDone. WebM files in ${config.videosDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
