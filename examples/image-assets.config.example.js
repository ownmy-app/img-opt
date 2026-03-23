/**
 * image-assets.config.js — copy this to your project root.
 *
 * img-opt looks for this file in (in order):
 *   $IMAGE_ASSETS_CONFIG env var
 *   scripts/image-assets.config.js
 *   image-assets.config.js  (project root)
 *
 * Workflow:
 *   1. `npx img-opt download` — fetches all URLs to imagesDir
 *   2. `npx img-opt compress` — converts to WebP at target quality
 *   3. `npx img-opt replace`  — rewrites every URL in source files
 *   (or just `npx img-opt` to run all three)
 */

export default {
  /** Directory where images are saved, relative to project root */
  imagesDir: 'public/images',

  /** Directories to scan for URL replacement */
  replaceInDirs: ['src'],

  /** File extensions to scan when rewriting URLs */
  replaceExtensions: ['.js', '.jsx', '.ts', '.tsx', '.html', '.vue', '.svelte', '.md', '.mdx'],

  /** Compression settings */
  compress: {
    format: 'webp',
    quality: 82,
    /** Set false to keep original PNG/JPG alongside .webp */
    removeOriginals: true,
  },

  /**
   * External images to download.
   * After compression, every occurrence of `url` in source files
   * is replaced with `/images/<filename>.webp`.
   */
  sources: [
    {
      url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200',
      file: 'hero-banner.jpg',
    },
    {
      url: 'https://cdn.example.com/assets/logo-v3.png',
      file: 'logo.png',
    },
    {
      url: 'https://storage.googleapis.com/mybucket/team/founder-portrait.jpg',
      file: 'founder.jpg',
    },
    {
      url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      file: 'product-sample.jpg',
    },
  ],
};
