import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We test the exported helpers directly by importing scan.js functions
// Note: scanForUrls and urlToFilename are exported from scan.js
let scanForUrls, urlToFilename;

// Dynamic import since scan.js has a main() that runs on import as a script.
// We import the module functions via a workaround: re-export from a temp module.
// Actually, scan.js calls main() at module level, so we test urlToFilename via CLI
// and test scan patterns indirectly.

// For unit testing, let's test urlToFilename and the CLI behavior.

test('scan CLI runs without crashing (no config, defaults used)', async () => {
  const { execSync } = await import('node:child_process');
  const CLI = path.join(__dirname, '..', 'src', 'scan.js');

  // Run in temp dir with no config — should use defaults and find nothing
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-scan-'));
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });

  try {
    const out = execSync(`node ${CLI}`, { encoding: 'utf8', cwd: tmpDir });
    assert.match(out, /scan/i);
  } catch (err) {
    // Should not crash with unhandled error
    assert.ok(!err.stderr?.includes('TypeError'));
    assert.ok(!err.stderr?.includes('ReferenceError'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scan detects image URLs in HTML src attributes', async () => {
  const { execSync } = await import('node:child_process');
  const CLI = path.join(__dirname, '..', 'src', 'scan.js');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-scan-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  // Create a file with an external image URL
  fs.writeFileSync(path.join(srcDir, 'page.html'), `
    <html>
      <body>
        <img src="https://cdn.example.com/hero.png" alt="Hero" />
        <img src="https://images.unsplash.com/photo-123.jpg" />
      </body>
    </html>
  `);

  try {
    const out = execSync(`node ${CLI}`, { encoding: 'utf8', cwd: tmpDir });
    assert.match(out, /hero\.png/);
    assert.match(out, /photo-123\.jpg/);
    assert.match(out, /2 image/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scan detects video URLs', async () => {
  const { execSync } = await import('node:child_process');
  const CLI = path.join(__dirname, '..', 'src', 'scan.js');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-scan-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'video.jsx'), `
    export default function Hero() {
      return <video src="https://cdn.example.com/demo.mp4" />;
    }
  `);

  try {
    const out = execSync(`node ${CLI}`, { encoding: 'utf8', cwd: tmpDir });
    assert.match(out, /demo\.mp4/);
    assert.match(out, /1 video/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scan detects CSS url() patterns', async () => {
  const { execSync } = await import('node:child_process');
  const CLI = path.join(__dirname, '..', 'src', 'scan.js');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-scan-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'styles.css'), `
    .hero {
      background-image: url("https://cdn.example.com/bg-pattern.png");
    }
  `);

  try {
    const out = execSync(`node ${CLI}`, { encoding: 'utf8', cwd: tmpDir });
    assert.match(out, /bg-pattern\.png/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scan detects markdown image syntax', async () => {
  const { execSync } = await import('node:child_process');
  const CLI = path.join(__dirname, '..', 'src', 'scan.js');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-scan-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'readme.md'), `
    # My Project
    ![Screenshot](https://cdn.example.com/screenshot.png)
  `);

  try {
    const out = execSync(`node ${CLI}`, { encoding: 'utf8', cwd: tmpDir });
    assert.match(out, /screenshot\.png/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scan deduplicates same URL found in multiple files', async () => {
  const { execSync } = await import('node:child_process');
  const CLI = path.join(__dirname, '..', 'src', 'scan.js');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-scan-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const sharedUrl = 'https://cdn.example.com/logo.png';
  fs.writeFileSync(path.join(srcDir, 'header.jsx'), `<img src="${sharedUrl}" />`);
  fs.writeFileSync(path.join(srcDir, 'footer.jsx'), `<img src="${sharedUrl}" />`);

  try {
    const out = execSync(`node ${CLI}`, { encoding: 'utf8', cwd: tmpDir });
    assert.match(out, /1 image/); // deduplicated to 1
    assert.match(out, /header\.jsx/);
    assert.match(out, /footer\.jsx/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
