# img-opt

[![npm version](https://img.shields.io/npm/v/img-opt.svg)](https://www.npmjs.com/package/img-opt)
[![npm downloads](https://img.shields.io/npm/dm/img-opt.svg)](https://www.npmjs.com/package/img-opt)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Download external images → compress to WebP → rewrite all source URLs. One command.

Eliminates external image dependencies, cuts image payload by 60–80%, and updates every URL reference in your source automatically. Works with Vite, Next.js, Astro, Vue, and Svelte projects.

---

## Install

```bash
# As a dev dependency (recommended)
npm install --save-dev img-opt sharp

# Or globally
npm install -g img-opt
```

> `sharp` is a peer dependency — it handles the WebP conversion. Install it alongside `img-opt`.

---

## Quick start

```bash
# 1. Copy the example config
cp node_modules/img-opt/image-assets.config.example.js image-assets.config.js

# 2. Fill in your image sources
# (edit image-assets.config.js — see Configuration below)

# 3. Run
npx img-opt
```

That's it. Your external images are now local WebP files and every URL in `src/` has been updated.

---

## Configuration

`image-assets.config.js` (project root):

```js
export default {
  imagesDir: 'public/images',       // where to save downloaded images
  replaceInDirs: ['src'],           // directories to scan for URL rewrites
  compress: {
    format: 'webp',                 // output format (webp recommended)
    quality: 82,                    // 1-100, 80-85 hits the sweet spot
    removeOriginals: true,          // delete PNG/JPG after converting
  },
  sources: [
    { url: 'https://example.com/hero.png',    file: 'hero.png'    },
    { url: 'https://cdn.example.com/logo.jpg', file: 'logo.jpg'   },
    { url: 'https://assets.example.com/og.jpg', file: 'og.jpg'    },
  ],
};
```

### Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `imagesDir` | string | `'public/images'` | Directory where images are saved |
| `replaceInDirs` | string[] | `['src']` | Directories scanned for URL replacement |
| `compress.format` | `'webp'` \| `'jpeg'` \| `'png'` | `'webp'` | Output image format |
| `compress.quality` | number | `82` | Compression quality (1–100) |
| `compress.removeOriginals` | boolean | `true` | Delete source files after converting |
| `sources` | Array | **required** | List of `{ url, file }` objects to download |

---

## Commands

```bash
# Full pipeline: download → compress → replace (default)
npx img-opt

# Step by step
npx img-opt download    # fetch URLs → save to public/images/
npx img-opt compress    # convert PNG/JPG → WebP in place
npx img-opt replace     # rewrite external URLs in src/ files
```

Add to `package.json` scripts for convenience:

```json
{
  "scripts": {
    "images": "img-opt",
    "images:download": "img-opt download",
    "images:compress": "img-opt compress"
  }
}
```

---

## What happens under the hood

1. **Download** — fetches each URL (follows redirects), saves to `imagesDir/<file>`. Skips already-downloaded files.
2. **Compress** — converts PNG/JPG to WebP at configured quality using `sharp`. Original files are optionally deleted.
3. **Replace** — scans all files in `replaceInDirs` matching `**/*.{js,jsx,ts,tsx,html,vue,svelte,astro,css,md}`. Replaces each external URL with `/images/<name>.webp`.

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

Run as part of your build to catch un-optimized images before deploy:

```yaml
# .github/workflows/build.yml
- name: Optimize images
  run: npx img-opt
```

Or fail the build if any external image URLs remain:

```bash
# After running img-opt, grep for remaining external img URLs
grep -r 'https://.*\.(png|jpg|jpeg|gif)' src/ && echo "Unoptimized external images found" && exit 1 || echo "All images local"
```

---

## Typical results

| Metric | Before | After |
|--------|--------|-------|
| External requests at load | 8–12 | 0 |
| Image payload | 2.4 MB | 480 KB |
| Largest Contentful Paint | 3.1 s | 1.2 s |

Results vary by image content and starting format. WebP conversion at quality 82 typically reduces PNG by 70–80% and JPG by 40–60%.

---

## Use as a library

```js
import { downloadImages, compressImages, replaceUrls } from 'img-opt';

// Or run the full pipeline programmatically
import { runPipeline } from 'img-opt';

await runPipeline({
  imagesDir: 'public/images',
  replaceInDirs: ['src'],
  compress: { format: 'webp', quality: 82, removeOriginals: true },
  sources: [
    { url: 'https://example.com/hero.png', file: 'hero.png' },
  ],
});
```

---

## Contributing

PRs welcome. Run tests with `npm test`.

---

## License

MIT © [Nometria](https://nometria.com)
