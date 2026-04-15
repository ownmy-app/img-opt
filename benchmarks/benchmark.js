#!/usr/bin/env node
/**
 * img-opt Benchmark Suite
 *
 * Tests compression ratio, quality, and speed using programmatically
 * generated test images via sharp.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const OUTPUT_DIR = path.join(__dirname, 'output');

// ── Generate test fixtures ──────────────────────────────────────────────

async function generateTestImages() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const images = [];

  // 1. Simple solid color PNG (best-case compression)
  const solidPng = path.join(FIXTURES_DIR, 'solid-color.png');
  await sharp({ create: { width: 1920, height: 1080, channels: 3, background: { r: 65, g: 105, b: 225 } } })
    .png()
    .toFile(solidPng);
  images.push({ name: 'Solid color PNG (1920x1080)', path: solidPng, format: 'png' });

  // 2. Gradient PNG (moderate compression)
  const gradientBuf = Buffer.alloc(800 * 600 * 3);
  for (let y = 0; y < 600; y++) {
    for (let x = 0; x < 800; x++) {
      const i = (y * 800 + x) * 3;
      gradientBuf[i] = Math.floor(x / 800 * 255);
      gradientBuf[i + 1] = Math.floor(y / 600 * 255);
      gradientBuf[i + 2] = 128;
    }
  }
  const gradientPng = path.join(FIXTURES_DIR, 'gradient.png');
  await sharp(gradientBuf, { raw: { width: 800, height: 600, channels: 3 } })
    .png()
    .toFile(gradientPng);
  images.push({ name: 'Gradient PNG (800x600)', path: gradientPng, format: 'png' });

  // 3. Noise PNG (worst-case, random data)
  const noiseBuf = Buffer.alloc(640 * 480 * 3);
  for (let i = 0; i < noiseBuf.length; i++) {
    noiseBuf[i] = Math.floor(Math.random() * 256);
  }
  const noisePng = path.join(FIXTURES_DIR, 'noise.png');
  await sharp(noiseBuf, { raw: { width: 640, height: 480, channels: 3 } })
    .png()
    .toFile(noisePng);
  images.push({ name: 'Random noise PNG (640x480)', path: noisePng, format: 'png' });

  // 4. JPEG photo-like (gradient with variation)
  const photoLikeBuf = Buffer.alloc(1024 * 768 * 3);
  for (let y = 0; y < 768; y++) {
    for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 3;
      photoLikeBuf[i] = Math.floor((Math.sin(x / 50) * 0.5 + 0.5) * 255);
      photoLikeBuf[i + 1] = Math.floor((Math.cos(y / 30) * 0.5 + 0.5) * 255);
      photoLikeBuf[i + 2] = Math.floor((Math.sin((x + y) / 40) * 0.5 + 0.5) * 255);
    }
  }
  const photoJpg = path.join(FIXTURES_DIR, 'photo-like.jpg');
  await sharp(photoLikeBuf, { raw: { width: 1024, height: 768, channels: 3 } })
    .jpeg({ quality: 90 })
    .toFile(photoJpg);
  images.push({ name: 'Photo-like JPEG (1024x768)', path: photoJpg, format: 'jpeg' });

  // 5. Small icon PNG
  const iconPng = path.join(FIXTURES_DIR, 'icon.png');
  await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 100, b: 50, alpha: 1 } } })
    .png()
    .toFile(iconPng);
  images.push({ name: 'Small icon PNG (64x64)', path: iconPng, format: 'png' });

  // 6. Large high-res image
  const largeBuf = Buffer.alloc(2560 * 1440 * 3);
  for (let y = 0; y < 1440; y++) {
    for (let x = 0; x < 2560; x++) {
      const i = (y * 2560 + x) * 3;
      largeBuf[i] = (x * y) % 256;
      largeBuf[i + 1] = (x + y) % 256;
      largeBuf[i + 2] = Math.abs(x - y) % 256;
    }
  }
  const largeJpg = path.join(FIXTURES_DIR, 'large.jpg');
  await sharp(largeBuf, { raw: { width: 2560, height: 1440, channels: 3 } })
    .jpeg({ quality: 85 })
    .toFile(largeJpg);
  images.push({ name: 'Large JPEG (2560x1440)', path: largeJpg, format: 'jpeg' });

  return images;
}

// ── Benchmark: Compression ──────────────────────────────────────────────

async function benchmarkCompression(images) {
  console.log('\n📊 Compression Benchmark');
  console.log('─'.repeat(75));
  console.log(
    'Image'.padEnd(32),
    'Original'.padStart(10),
    'WebP'.padStart(10),
    'Ratio'.padStart(8),
    'Saved'.padStart(8),
  );
  console.log('─'.repeat(75));

  const results = [];
  const quality = 82; // Default quality used by img-opt

  for (const img of images) {
    const originalSize = fs.statSync(img.path).size;
    const outputPath = path.join(OUTPUT_DIR, path.basename(img.path, path.extname(img.path)) + '.webp');

    await sharp(img.path).webp({ quality }).toFile(outputPath);

    const compressedSize = fs.statSync(outputPath).size;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    const saved = formatBytes(originalSize - compressedSize);

    console.log(
      img.name.padEnd(32),
      formatBytes(originalSize).padStart(10),
      formatBytes(compressedSize).padStart(10),
      `${ratio}%`.padStart(8),
      saved.padStart(8),
    );

    results.push({
      name: img.name,
      original_bytes: originalSize,
      compressed_bytes: compressedSize,
      reduction_pct: parseFloat(ratio),
    });
  }

  const totalOrig = results.reduce((s, r) => s + r.original_bytes, 0);
  const totalComp = results.reduce((s, r) => s + r.compressed_bytes, 0);
  const avgReduction = ((1 - totalComp / totalOrig) * 100).toFixed(1);

  console.log('─'.repeat(75));
  console.log(
    'TOTAL'.padEnd(32),
    formatBytes(totalOrig).padStart(10),
    formatBytes(totalComp).padStart(10),
    `${avgReduction}%`.padStart(8),
    formatBytes(totalOrig - totalComp).padStart(8),
  );

  return { results, avgReduction: parseFloat(avgReduction) };
}

// ── Benchmark: Speed ────────────────────────────────────────────────────

async function benchmarkSpeed(images) {
  console.log('\n⚡ Speed Benchmark');
  console.log('─'.repeat(55));
  console.log('Image'.padEnd(32), 'Time (ms)'.padStart(10), 'Throughput'.padStart(12));
  console.log('─'.repeat(55));

  const results = [];

  for (const img of images) {
    const outputPath = path.join(OUTPUT_DIR, `speed-${path.basename(img.path, path.extname(img.path))}.webp`);
    const originalSize = fs.statSync(img.path).size;

    // Warm up
    await sharp(img.path).webp({ quality: 82 }).toFile(outputPath);
    fs.unlinkSync(outputPath);

    // Timed run (average of 3)
    const times = [];
    for (let i = 0; i < 3; i++) {
      const out = path.join(OUTPUT_DIR, `speed-${i}-${path.basename(img.path, path.extname(img.path))}.webp`);
      const start = performance.now();
      await sharp(img.path).webp({ quality: 82 }).toFile(out);
      times.push(performance.now() - start);
      fs.unlinkSync(out);
    }

    const avgMs = times.reduce((a, b) => a + b) / times.length;
    const mbps = (originalSize / 1024 / 1024) / (avgMs / 1000);

    console.log(
      img.name.padEnd(32),
      `${avgMs.toFixed(1)}`.padStart(10),
      `${mbps.toFixed(1)} MB/s`.padStart(12),
    );

    results.push({ name: img.name, avg_ms: parseFloat(avgMs.toFixed(1)), mbps: parseFloat(mbps.toFixed(1)) });
  }

  const totalMs = results.reduce((s, r) => s + r.avg_ms, 0);
  console.log('─'.repeat(55));
  console.log('Total'.padEnd(32), `${totalMs.toFixed(0)} ms`.padStart(10));

  return results;
}

// ── Benchmark: Quality Validation ───────────────────────────────────────

async function benchmarkQuality(images) {
  console.log('\n🔍 Quality Validation');
  console.log('─'.repeat(60));
  console.log('Image'.padEnd(32), 'Valid WebP'.padStart(10), 'Dimensions'.padStart(16));
  console.log('─'.repeat(60));

  const results = [];

  for (const img of images) {
    const outputPath = path.join(OUTPUT_DIR, `quality-${path.basename(img.path, path.extname(img.path))}.webp`);
    await sharp(img.path).webp({ quality: 82 }).toFile(outputPath);

    const metadata = await sharp(outputPath).metadata();
    const origMeta = await sharp(img.path).metadata();
    const valid = metadata.format === 'webp';
    const dimsMatch = metadata.width === origMeta.width && metadata.height === origMeta.height;

    const status = valid && dimsMatch ? '✅' : '❌';
    console.log(
      img.name.padEnd(32),
      `${status}`.padStart(10),
      `${metadata.width}x${metadata.height}`.padStart(16),
    );

    results.push({
      name: img.name,
      valid_webp: valid,
      dimensions_preserved: dimsMatch,
      width: metadata.width,
      height: metadata.height,
    });

    fs.unlinkSync(outputPath);
  }

  return results;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('img-opt Benchmark Suite');
  console.log('='.repeat(60));

  console.log('\nGenerating test images...');
  const images = await generateTestImages();
  console.log(`Created ${images.length} test images`);

  const compression = await benchmarkCompression(images);
  const speed = await benchmarkSpeed(images);
  const quality = await benchmarkQuality(images);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n  Average compression: ${compression.avgReduction}% size reduction`);
  console.log(`  All outputs valid WebP: ${quality.every(q => q.valid_webp) ? '✅ Yes' : '❌ No'}`);
  console.log(`  Dimensions preserved:   ${quality.every(q => q.dimensions_preserved) ? '✅ Yes' : '❌ No'}`);

  // Save results
  const resultsPath = path.join(__dirname, 'results.json');
  const allResults = { compression, speed, quality, timestamp: new Date().toISOString() };
  fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
  console.log(`\n  Results saved to ${resultsPath}`);

  // Cleanup
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

main().catch((err) => { console.error(err); process.exit(1); });
