/**
 * image-assets.config.js  — copy this file to your project root.
 *
 * img-opt looks for this file in (in order):
 *   $IMAGE_ASSETS_CONFIG env var
 *   scripts/image-assets.config.js
 *   image-assets.config.js  (project root)
 */

export default {
  /** Directory where images are saved, relative to project root */
  imagesDir: 'public/images',

  /** Directories to search when rewriting URLs (after compress) */
  replaceInDirs: ['src'],

  /** File extensions to scan for URL replacement */
  replaceExtensions: ['.js', '.jsx', '.ts', '.tsx', '.html', '.vue', '.svelte', '.md', '.mdx'],

  /** Compression settings */
  compress: {
    format: 'webp',
    quality: 82,
    /** Set to false to keep original PNG/JPG alongside .webp */
    removeOriginals: true,
  },

  /**
   * External images to download.
   * After compress, all occurrences of `url` in source files are replaced
   * with `/images/<file base>.webp`
   */
  sources: [
    // { url: 'https://example.com/hero.png',   file: 'hero.png' },
    // { url: 'https://example.com/logo.jpg',   file: 'logo.jpg' },
  ],
};
