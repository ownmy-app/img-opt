#!/usr/bin/env node
/**
 * img-opt CLI — run the full pipeline from any project directory.
 *
 * Usage:
 *   npx img-opt           # run all 3 steps
 *   npx img-opt download  # download only
 *   npx img-opt compress  # compress only
 *   npx img-opt replace   # URL replace only
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPTS = {
  download: path.join(__dirname, 'download.js'),
  compress: path.join(__dirname, 'compress.js'),
  replace:  path.join(__dirname, 'replace.js'),
  all:      path.join(__dirname, 'run-all.js'),
};

function run(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], { stdio: 'inherit', cwd: process.cwd() });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

const [,, cmd = 'all'] = process.argv;
const script = SCRIPTS[cmd];

if (!script) {
  console.error(`Unknown command: ${cmd}. Use: all | download | compress | replace`);
  process.exit(1);
}

run(script).catch((e) => { console.error(e.message); process.exit(1); });
