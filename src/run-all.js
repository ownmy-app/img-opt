#!/usr/bin/env node
/**
 * Run the full asset-optimization pipeline:
 *   1) Download external images + videos (auto-scanned or from config)
 *   2) Compress images to WebP with Sharp
 *   3) Compress videos to WebM with ffmpeg
 *   4) Replace URLs in source files
 *
 * Requires: sharp (optional peer dep) and ffmpeg (system binary, optional).
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));

function run(scriptName, { allowFail = false, extraArgs = [] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, scriptName), ...extraArgs], {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: false,
    });
    child.on('close', (code) => {
      if (code === 0) return resolve(true);
      if (allowFail) return resolve(false);
      reject(new Error(`${scriptName} exited with ${code}`));
    });
  });
}

async function main() {
  console.log('--- 1/4 Download ---\n');
  await run('download.js');

  console.log('\n--- 2/4 Compress Images ---\n');
  const imagesCompressed = await run('compress.js', { allowFail: true });
  if (!imagesCompressed) {
    console.log('\n  Image compression skipped. Install Sharp to enable: npm i -D sharp\n');
  }

  console.log('\n--- 3/4 Compress Videos ---\n');
  const videosCompressed = await run('video-compress.js', { allowFail: true });
  if (!videosCompressed) {
    console.log('\n  Video compression skipped. Install ffmpeg to enable: brew install ffmpeg\n');
  }

  console.log('\n--- 4/4 Replace URLs ---\n');
  await run('replace.js', { extraArgs: flags });
  console.log('\nAll done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
