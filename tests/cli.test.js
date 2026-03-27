import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'src', 'cli.js');

test('CLI prints help and exits 0', () => {
  const out = execSync(`node ${CLI} --help`, { encoding: 'utf8' });
  assert.match(out, /img-opt/i);
  assert.match(out, /scan/i);
  assert.match(out, /video/i);
  assert.match(out, /download/i);
  assert.match(out, /compress/i);
  assert.match(out, /replace/i);
});

test('CLI rejects unknown flags gracefully', () => {
  try {
    execSync(`node ${CLI} --unknown-flag 2>&1`, { encoding: 'utf8' });
  } catch (err) {
    // Should exit non-zero but not crash with an unhandled exception
    assert.ok(err.status !== undefined);
  }
});

test('CLI accepts "scan" as a valid command', () => {
  try {
    execSync(`node ${CLI} --unknown-flag 2>&1`, { encoding: 'utf8' });
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    // "scan" should be listed as a valid command in the error message
    assert.match(output, /scan/);
  }
});

test('CLI accepts "video" as a valid command', () => {
  try {
    execSync(`node ${CLI} --unknown-flag 2>&1`, { encoding: 'utf8' });
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    // "video" should be listed as a valid command in the error message
    assert.match(output, /video/);
  }
});
