/**
 * img-opt benchmark suite (runs as a test)
 *
 * Tests compression ratio, processing speed, and output validity
 * for JPEG, PNG, and GIF images using programmatically generated test images.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH_DIR = path.join(os.tmpdir(), 'img-opt-bench-' + Date.now());
const FIXTURES_DIR = path.join(BENCH_DIR, 'fixtures');
const OUTPUT_DIR = path.join(BENCH_DIR, 'output');
const RESULTS_FILE = path.join(__dirname, '..', 'benchmarks', 'results.json');

// ── Fixture generation ──────────────────────────────────────────────────

async function generateTestImage(width, height, type) {
  const channels = type === 'png' ? 4 : 3;
  const pixels = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const blockX = Math.floor(x / 64) % 4;
      const blockY = Math.floor(y / 64) % 4;
      const gradientR = Math.floor((x / width) * 200) + Math.floor(Math.random() * 30);
      const gradientG = Math.floor((y / height) * 180) + Math.floor(Math.random() * 20);
      const gradientB = Math.floor(((x + y) / (width + height)) * 220) + blockX * 30;

      pixels[idx] = Math.min(255, gradientR + blockY * 15);
      pixels[idx + 1] = Math.min(255, gradientG);
      pixels[idx + 2] = Math.min(255, gradientB + blockX * 20);
      if (channels === 4) pixels[idx + 3] = 255;
    }
  }

  return sharp(pixels, { raw: { width, height, channels } });
}

function hrToMs(hr) {
  return hr[0] * 1000 + hr[1] / 1e6;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ── Setup ───────────────────────────────────────────────────────────────

const FIXTURES = [
  { name: 'small-photo', width: 320, height: 240, format: 'jpeg', quality: 90 },
  { name: 'small-graphic', width: 320, height: 240, format: 'png' },
  { name: 'small-anim', width: 320, height: 240, format: 'gif' },
  { name: 'medium-photo', width: 800, height: 600, format: 'jpeg', quality: 85 },
  { name: 'medium-graphic', width: 800, height: 600, format: 'png' },
  { name: 'medium-anim', width: 800, height: 600, format: 'gif' },
  { name: 'large-photo', width: 1920, height: 1080, format: 'jpeg', quality: 90 },
  { name: 'large-graphic', width: 1920, height: 1080, format: 'png' },
  { name: 'xlarge-photo', width: 3840, height: 2160, format: 'jpeg', quality: 92 },
];

let fixturesReady = [];
const allResults = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  sharpVersion: sharp.versions?.sharp || 'unknown',
  compression: [],
  qualitySweep: [],
  throughput: null,
  parallelism: [],
  effort: [],
};

test('benchmark: generate test fixtures', async () => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('\nGenerating test fixtures...\n');

  for (const f of FIXTURES) {
    const ext = f.format === 'jpeg' ? 'jpg' : f.format;
    const outPath = path.join(FIXTURES_DIR, `${f.name}.${ext}`);

    const img = await generateTestImage(f.width, f.height, f.format);
    if (f.format === 'jpeg') {
      await img.jpeg({ quality: f.quality || 85 }).toFile(outPath);
    } else if (f.format === 'png') {
      await img.png().toFile(outPath);
    } else if (f.format === 'gif') {
      await img.gif().toFile(outPath);
    }

    const stat = fs.statSync(outPath);
    console.log(`  Created ${f.name}.${ext} (${(stat.size / 1024).toFixed(1)} KB, ${f.width}x${f.height})`);
    fixturesReady.push({ ...f, path: outPath });
  }

  assert.equal(fixturesReady.length, FIXTURES.length, 'All fixtures generated');
});

test('benchmark: compression ratio at quality=82', async () => {
  console.log('\n=== Compression Ratio (quality=82) ===\n');
  console.log(
    `${'Image'.padEnd(22)} ${'Format'.padEnd(8)} ${'Input'.padStart(10)} ${'Output'.padStart(10)} ${'Ratio'.padStart(8)} ${'Time'.padStart(10)} ${'Valid'.padStart(6)}`
  );
  console.log('-'.repeat(80));

  for (const f of fixturesReady) {
    const inputStat = fs.statSync(f.path);
    const ext = path.extname(f.path).toLowerCase();
    const baseName = path.basename(f.path, ext);
    const outPath = path.join(OUTPUT_DIR, `${baseName}-q82.webp`);

    const start = process.hrtime();
    await sharp(f.path).webp({ quality: 82 }).toFile(outPath);
    const elapsed = process.hrtime(start);

    const outputStat = fs.statSync(outPath);
    const ratio = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);
    const timeMs = hrToMs(elapsed);

    const metadata = await sharp(outPath).metadata();
    const isValid = metadata.format === 'webp' && metadata.width > 0 && metadata.height > 0;

    const result = {
      label: f.name,
      inputFormat: ext.replace('.', ''),
      inputSize: inputStat.size,
      outputSize: outputStat.size,
      compressionRatio: parseFloat(ratio),
      timeMs: parseFloat(timeMs.toFixed(2)),
      isValidWebP: isValid,
      outputWidth: metadata.width,
      outputHeight: metadata.height,
      quality: 82,
    };
    allResults.compression.push(result);

    console.log(
      `${result.label.padEnd(22)} ${result.inputFormat.padEnd(8)} ${formatBytes(result.inputSize).padStart(10)} ${formatBytes(result.outputSize).padStart(10)} ${(result.compressionRatio + '%').padStart(8)} ${(result.timeMs.toFixed(0) + ' ms').padStart(10)} ${(result.isValidWebP ? 'YES' : 'NO').padStart(6)}`
    );

    assert.ok(isValid, `${f.name} produces valid WebP`);
    assert.ok(outputStat.size < inputStat.size, `${f.name} compressed output is smaller`);
  }
});

test('benchmark: quality sweep on medium JPEG', async () => {
  const mediumJpeg = fixturesReady.find((f) => f.name === 'medium-photo');
  assert.ok(mediumJpeg, 'medium-photo fixture exists');

  console.log('\n=== Quality Sweep (medium-photo.jpg) ===\n');
  console.log(`${'Quality'.padEnd(10)} ${'Output'.padStart(10)} ${'Ratio'.padStart(8)} ${'Time'.padStart(10)}`);
  console.log('-'.repeat(42));

  const qualities = [50, 65, 75, 82, 90, 95];
  let prevSize = 0;

  for (const q of qualities) {
    const inputStat = fs.statSync(mediumJpeg.path);
    const outPath = path.join(OUTPUT_DIR, `medium-photo-q${q}.webp`);

    const start = process.hrtime();
    await sharp(mediumJpeg.path).webp({ quality: q }).toFile(outPath);
    const elapsed = process.hrtime(start);

    const outputStat = fs.statSync(outPath);
    const ratio = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);

    const result = {
      label: `medium-photo q=${q}`,
      inputFormat: 'jpg',
      inputSize: inputStat.size,
      outputSize: outputStat.size,
      compressionRatio: parseFloat(ratio),
      timeMs: parseFloat(hrToMs(elapsed).toFixed(2)),
      quality: q,
    };
    allResults.qualitySweep.push(result);

    console.log(
      `${('q=' + q).padEnd(10)} ${formatBytes(result.outputSize).padStart(10)} ${(result.compressionRatio + '%').padStart(8)} ${(result.timeMs.toFixed(0) + ' ms').padStart(10)}`
    );

    // Higher quality should produce equal or larger files
    if (prevSize > 0) {
      assert.ok(outputStat.size >= prevSize, `q=${q} should be >= q=${q - 1} in size`);
    }
    prevSize = outputStat.size;
  }
});

test('benchmark: throughput (sequential)', async () => {
  const smallFixtures = fixturesReady.filter((f) => f.width <= 800);
  const iterations = 3;

  console.log('\n=== Throughput (sequential, quality=82) ===\n');

  const start = process.hrtime();
  let count = 0;

  for (let i = 0; i < iterations; i++) {
    for (const f of smallFixtures) {
      const ext = path.extname(f.path).toLowerCase();
      const baseName = path.basename(f.path, ext);
      const outPath = path.join(OUTPUT_DIR, `throughput-${baseName}-${i}.webp`);
      await sharp(f.path).webp({ quality: 82 }).toFile(outPath);
      count++;
    }
  }

  const elapsed = process.hrtime(start);
  const totalMs = hrToMs(elapsed);
  const imagesPerSecond = parseFloat((count / (totalMs / 1000)).toFixed(2));

  allResults.throughput = {
    totalImages: count,
    totalTimeMs: parseFloat(totalMs.toFixed(2)),
    imagesPerSecond,
    quality: 82,
  };

  console.log(`  Total images processed: ${count}`);
  console.log(`  Total time: ${(totalMs / 1000).toFixed(2)}s`);
  console.log(`  Throughput: ${imagesPerSecond} images/second`);

  assert.ok(imagesPerSecond > 0, 'Throughput is positive');
});

test('benchmark: parallelism comparison', async () => {
  console.log('\n=== Parallelism Comparison ===\n');
  console.log(`${'Concurrency'.padEnd(14)} ${'Images'.padStart(8)} ${'Time'.padStart(10)} ${'Img/s'.padStart(10)}`);
  console.log('-'.repeat(46));

  for (const concurrency of [1, 2, 4, 8]) {
    const start = process.hrtime();
    let count = 0;

    for (let i = 0; i < fixturesReady.length; i += concurrency) {
      const batch = fixturesReady.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (f) => {
          const ext = path.extname(f.path).toLowerCase();
          const baseName = path.basename(f.path, ext);
          const outPath = path.join(OUTPUT_DIR, `parallel-${baseName}-c${concurrency}.webp`);
          await sharp(f.path).webp({ quality: 82 }).toFile(outPath);
          count++;
        })
      );
    }

    const elapsed = process.hrtime(start);
    const totalMs = hrToMs(elapsed);

    const result = {
      concurrency,
      totalImages: count,
      totalTimeMs: parseFloat(totalMs.toFixed(2)),
      imagesPerSecond: parseFloat((count / (totalMs / 1000)).toFixed(2)),
    };
    allResults.parallelism.push(result);

    console.log(
      `${('c=' + concurrency).padEnd(14)} ${String(result.totalImages).padStart(8)} ${(result.totalTimeMs.toFixed(0) + ' ms').padStart(10)} ${String(result.imagesPerSecond).padStart(10)}`
    );
  }

  assert.ok(allResults.parallelism.length === 4, 'All parallelism levels tested');
});

test('benchmark: WebP effort levels', async () => {
  const largeJpeg = fixturesReady.find((f) => f.name === 'large-photo');
  assert.ok(largeJpeg, 'large-photo fixture exists');

  console.log('\n=== WebP Effort Levels (large-photo.jpg, quality=82) ===\n');
  console.log(`${'Effort'.padEnd(12)} ${'Output'.padStart(10)} ${'Ratio'.padStart(8)} ${'Time'.padStart(10)}`);
  console.log('-'.repeat(44));

  const efforts = [0, 2, 4, 6];

  for (const effort of efforts) {
    const ext = path.extname(largeJpeg.path).toLowerCase();
    const baseName = path.basename(largeJpeg.path, ext);
    const outPath = path.join(OUTPUT_DIR, `${baseName}-effort${effort}.webp`);

    const start = process.hrtime();
    await sharp(largeJpeg.path).webp({ quality: 82, effort }).toFile(outPath);
    const elapsed = process.hrtime(start);

    const outputStat = fs.statSync(outPath);
    const inputStat = fs.statSync(largeJpeg.path);
    const ratio = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);

    const result = {
      label: `large-photo effort=${effort}`,
      effort,
      outputSize: outputStat.size,
      compressionRatio: parseFloat(ratio),
      timeMs: parseFloat(hrToMs(elapsed).toFixed(2)),
    };
    allResults.effort.push(result);

    console.log(
      `${('e=' + effort).padEnd(12)} ${formatBytes(result.outputSize).padStart(10)} ${(result.compressionRatio + '%').padStart(8)} ${(result.timeMs.toFixed(0) + ' ms').padStart(10)}`
    );
  }
});

test('benchmark: summary and save results', async () => {
  console.log('\n=== Summary ===\n');

  const jpegResults = allResults.compression.filter((r) => r.inputFormat === 'jpg');
  const pngResults = allResults.compression.filter((r) => r.inputFormat === 'png');
  const gifResults = allResults.compression.filter((r) => r.inputFormat === 'gif');
  const avgRatio = (arr) =>
    arr.length ? (arr.reduce((s, r) => s + r.compressionRatio, 0) / arr.length).toFixed(1) : 'N/A';

  console.log(`  Average JPEG -> WebP compression: ${avgRatio(jpegResults)}%`);
  console.log(`  Average PNG  -> WebP compression: ${avgRatio(pngResults)}%`);
  console.log(`  Average GIF  -> WebP compression: ${avgRatio(gifResults)}%`);

  if (allResults.throughput) {
    console.log(`  Sequential throughput: ${allResults.throughput.imagesPerSecond} img/s`);
  }

  if (allResults.parallelism.length > 1) {
    const bestParallel = allResults.parallelism.reduce((a, b) =>
      a.imagesPerSecond > b.imagesPerSecond ? a : b
    );
    const seqParallel = allResults.parallelism.find((r) => r.concurrency === 1);
    if (seqParallel && bestParallel.concurrency > 1) {
      const speedup = (bestParallel.imagesPerSecond / seqParallel.imagesPerSecond).toFixed(2);
      console.log(
        `  Best parallelism: c=${bestParallel.concurrency} (${speedup}x speedup, ${bestParallel.imagesPerSecond} img/s)`
      );
    }
  }

  const allValid = allResults.compression.every((r) => r.isValidWebP);
  console.log(`  All outputs valid WebP: ${allValid ? 'YES' : 'NO'}`);

  // Save results JSON
  const resultsDir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(allResults, null, 2));
  console.log(`\n  Results saved to benchmarks/results.json`);

  // Cleanup
  fs.rmSync(BENCH_DIR, { recursive: true, force: true });

  assert.ok(allValid, 'All outputs are valid WebP');
  assert.ok(allResults.compression.length > 0, 'Compression results collected');
});
