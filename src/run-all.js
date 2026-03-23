#!/usr/bin/env node
/**
 * Run download -> compress -> replace in sequence. Run from project root: node scripts/images-download-compress-replace.js
 * Steps: 1) Download external images to public/images  2) Compress to WebP with Sharp  3) Replace URLs in source
 * Requires: pnpm add -D sharp (then pnpm run images)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = path.join(__dirname);

function run(scriptName, allowFail = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(scriptDir, scriptName)], {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true,
    });
    child.on('close', (code) => {
      if (code === 0) return resolve(true);
      if (allowFail) return resolve(false);
      reject(new Error(`${scriptName} exited with ${code}`));
    });
  });
}

async function main() {
  console.log('--- 1/3 Download ---\n');
  await run('download.js');
  console.log('\n--- 2/3 Compress ---\n');
  const compressed = await run('compress.js', true);
  if (!compressed) {
    console.log('\nSkipping replace (no WebP files). Install Sharp and re-run to compress and replace URLs:\n  pnpm add -D sharp && pnpm run images\n');
    process.exit(1);
  }
  console.log('\n--- 3/3 Replace URLs ---\n');
  await run('replace.js');
  console.log('\nAll done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
