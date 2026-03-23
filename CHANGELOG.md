# Changelog

All notable changes to `img-opt` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
