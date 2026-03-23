#!/usr/bin/env node
/**
 * Download external images from image-assets.config.js into public/images (or configured imagesDir).
 * Run from project root: node scripts/download-images.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { getConfig } from './lib/get-config.js';

function download(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)' } }, (res) => {
      const redirect = res.headers.location;
      if (redirect && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307)) {
        res.resume();
        return download(redirect).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ data: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
}

async function main() {
  const { config, projectRoot } = await getConfig();
  const outDir = path.join(projectRoot, config.imagesDir);
  const sources = config.sources || [];

  if (!sources.length) {
    console.log('No sources in config. Add sources to image-assets.config.js');
    return;
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const { url, file } of sources) {
    try {
      process.stdout.write(`Downloading ${file}... `);
      const { data } = await download(url);
      const outPath = path.join(outDir, file);
      fs.writeFileSync(outPath, data);
      console.log(`OK (${(data.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log(`\nDone. Images saved to ${config.imagesDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
