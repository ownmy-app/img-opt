# img-opt

[![npm version](https://img.shields.io/npm/v/%40nometria-ai%2Fimg-opt.svg)](https://www.npmjs.com/package/@nometria-ai/img-opt)
[![npm downloads](https://img.shields.io/npm/dm/%40nometria-ai%2Fimg-opt.svg)](https://www.npmjs.com/package/@nometria-ai/img-opt)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Auto-scan your codebase for external images & videos, compress to WebP/WebM, rewrite all URLs. Zero config.

Eliminates external media dependencies, cuts image payload by 60-80%, compresses videos to WebM, and updates every URL reference in your source automatically. Works with Vite, Next.js, Astro, Vue, and Svelte projects.

---

## Quick start

```bash
# Install
npm install --save-dev @nometria-ai/img-opt sharp

# Run — that's it. No config file needed.
npx img-opt
```

img-opt auto-scans your `src/` directory for external image and video URLs, downloads them, compresses images to WebP and videos to WebM, then rewrites every URL reference.

---

## What's new in v2.0

- **Auto-scan** — no more manual `sources` config. img-opt discovers external URLs automatically.
- **Video support** — download and compress videos to WebM via ffmpeg.
- **Zero-config** — works without `image-assets.config.js`. Sensible defaults for all settings.

---

## Install

```bash
# As a dev dependency (recommended)
npm install --save-dev @nometria-ai/img-opt sharp

# For video compression, install ffmpeg:
# macOS:   brew install ffmpeg
# Ubuntu:  sudo apt install ffmpeg
# Windows: choco install ffmpeg
```

> `sharp` is a peer dependency for image compression. `ffmpeg` is a system dependency for video compression. Both are optional — the pipeline skips steps gracefully if they're missing.

---

## Commands

```bash
npx img-opt                # full pipeline (scan → download → compress → replace)
npx img-opt scan           # discover external image/video URLs (dry-run)
npx img-opt download       # fetch external images + videos
npx img-opt compress       # convert PNG/JPG → WebP via Sharp
npx img-opt video          # convert MP4/MOV → WebM via ffmpeg
npx img-opt replace        # rewrite external URLs in source files
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "optimize": "img-opt",
    "optimize:scan": "img-opt scan"
  }
}
```

---

## How it works

### Auto-scan (new in v2.0)

When no `sources` are configured, img-opt scans your codebase and detects:

- `<img src="https://...">` and `<Image src="...">` (React, Next.js)
- `<video src="...">`, `<source src="...">`, `poster="..."`
- CSS `url(https://...)`
- Markdown `![alt](https://...)`
- String literals containing image/video URLs (`.png`, `.jpg`, `.mp4`, etc.)
- `srcset` attribute entries

Run `npx img-opt scan` to preview what will be found before downloading.

### Pipeline

1. **Scan** — auto-discovers external image and video URLs in your source files
2. **Download** — fetches each URL (follows redirects), saves to `public/images/` and `public/videos/`
3. **Compress images** — converts PNG/JPG to WebP at configured quality using Sharp
4. **Compress videos** — converts MP4/MOV/AVI to WebM using ffmpeg (VP9 + Opus)
5. **Replace** — rewrites all URLs in source files (`.png` → `.webp`, `.mp4` → `.webm`, external URLs → local paths)

---

## Configuration (optional)

Create `image-assets.config.js` in your project root to override defaults:

```js
export default {
  autoScan: true,                    // scan codebase for URLs (default: true)
  imagesDir: 'public/images',       // where to save images
  videosDir: 'public/videos',       // where to save videos
  replaceInDirs: ['src'],           // directories to scan
  compress: {
    format: 'webp',
    quality: 82,
    removeOriginals: true,
  },
  videoCompress: {
    format: 'webm',
    quality: 'good',                // 'fast' | 'good' | 'best'
    maxWidth: 1920,
    removeOriginals: true,
  },
  // Manual sources (optional — auto-scanned if empty)
  sources: [],
  videoSources: [],
};
```

### Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoScan` | boolean | `true` | Auto-discover external URLs when sources is empty |
| `imagesDir` | string | `'public/images'` | Directory where images are saved |
| `videosDir` | string | `'public/videos'` | Directory where videos are saved |
| `replaceInDirs` | string[] | `['src']` | Directories scanned for URL replacement |
| `replaceExtensions` | string[] | see below | File extensions to scan |
| `compress.format` | `'webp'` \| `'jpeg'` \| `'png'` | `'webp'` | Output image format |
| `compress.quality` | number | `82` | Image compression quality (1-100) |
| `compress.removeOriginals` | boolean | `true` | Delete source files after converting |
| `videoCompress.format` | string | `'webm'` | Output video format |
| `videoCompress.quality` | `'fast'` \| `'good'` \| `'best'` | `'good'` | Video quality preset |
| `videoCompress.maxWidth` | number | `1920` | Scale down videos wider than this |
| `videoCompress.removeOriginals` | boolean | `true` | Delete source video after converting |
| `sources` | Array | `[]` | Manual `{ url, file }` list (auto-scanned if empty) |
| `videoSources` | Array | `[]` | Manual `{ url, file }` list (auto-scanned if empty) |

Default `replaceExtensions`: `.js, .jsx, .ts, .tsx, .html, .vue, .svelte, .md, .mdx, .css, .astro`

---

## Supported frameworks

Works with any framework that serves a `public/` directory:

| Framework | Config `imagesDir` | Config `replaceInDirs` |
|-----------|-------------------|----------------------|
| Vite / Vue | `public/images` | `['src']` |
| Next.js | `public/images` | `['app', 'pages', 'components']` |
| Astro | `public/images` | `['src']` |
| Svelte | `public/images` | `['src']` |
| Plain HTML | `images` | `['.']` |

---

## CI integration

Run as part of your build:

```yaml
# .github/workflows/build.yml
- name: Optimize assets
  run: npx img-opt
```

---

## Typical results

| Metric | Before | After |
|--------|--------|-------|
| External requests at load | 8-12 | 0 |
| Image payload | 2.4 MB | 480 KB |
| Video payload | 15 MB | 4 MB |
| Largest Contentful Paint | 3.1 s | 1.2 s |

---

## Contributing

PRs welcome. Run tests with `npm test`.

---

## License

MIT - [Nometria](https://nometria.com)
