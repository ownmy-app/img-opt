/**
 * Resolve image-assets config and project root. Usable from any project.
 * Config path: IMAGE_ASSETS_CONFIG env, or scripts/image-assets.config.js or image-assets.config.js in cwd.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function getConfig() {
  const cwd = process.cwd();
  const candidates = [
    process.env.IMAGE_ASSETS_CONFIG,
    path.join(cwd, 'scripts', 'image-assets.config.js'),
    path.join(cwd, 'image-assets.config.js'),
    path.join(__dirname, '..', 'image-assets.config.js'),
  ].filter(Boolean);

  let configPath;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      configPath = path.resolve(p);
      break;
    }
  }

  if (!configPath) {
    throw new Error(
      'Image assets config not found. Create scripts/image-assets.config.js or set IMAGE_ASSETS_CONFIG. See scripts/image-assets.config.js for a template.'
    );
  }

  const configDir = path.dirname(configPath);
  const projectRoot = path.basename(configDir) === 'scripts' ? path.dirname(configDir) : configDir;
  const mod = await import(configPath);
  const config = (mod.default || mod) ?? {};
  const resolvedRoot = path.resolve(config.projectRoot || projectRoot);

  return {
    config: {
      imagesDir: config.imagesDir ?? 'public/images',
      replaceInDirs: config.replaceInDirs ?? ['src'],
      replaceExtensions: config.replaceExtensions ?? ['.js', '.jsx', '.ts', '.tsx', '.html', '.vue', '.svelte', '.md', '.mdx'],
      compress: config.compress ?? { format: 'webp', quality: 82, removeOriginals: true },
      sources: config.sources ?? [],
    },
    projectRoot: resolvedRoot,
    configPath,
  };
}
