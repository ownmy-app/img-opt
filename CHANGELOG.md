# Changelog

All notable changes to `img-opt` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] - 2026-03-26

### Added
- **Auto-scan**: automatically discovers external image and video URLs in your codebase — no manual `sources` config needed
- New command: `npx img-opt scan` reports found external URLs without downloading
- **Video support**: download, compress to WebM (via ffmpeg), and rewrite video URLs
- New command: `npx img-opt video` for video-only compression
- New config options: `autoScan`, `videosDir`, `videoCompress`, `videoSources`
- Config file is now optional — sensible defaults used when absent
- Shared `walkDir` utility skips `node_modules`, `.git`, `dist`, `build`, etc.
- `.css` and `.astro` added to default scan extensions

### Changed
- `sources` config is now optional (auto-scan kicks in when empty)
- `run-all` pipeline now includes video compression as step 3/4
- Pipeline: download → compress images → compress videos → replace URLs
- Version bumped to 2.0.0

## [1.0.0] - 2025-03-22

### Added
- Full pipeline: download → compress → replace in one command (`npx img-opt`)
- Individual step commands: `img-opt download`, `img-opt compress`, `img-opt replace`
- `image-assets.config.js` config file for defining image sources, output directory, and compression settings
- WebP conversion via optional `sharp` peer dependency
- Configurable quality, output format, and `removeOriginals` flag
- URL replacement in all source files (`src/**/*.{js,jsx,ts,tsx,vue,svelte,html,astro,mdx}`)
- Works with Vite, Next.js, Astro, SvelteKit, Nuxt
- Node.js 18+ ESM package
