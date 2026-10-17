import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { modePaths, resolveSiteMode } from './src/lib/site-mode';

const mode = resolveSiteMode(process.env.SITE_MODE);
const paths = modePaths[mode];

export default defineConfig({
  site: 'https://hotdog.studio',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory', inlineStylesheets: 'never' },
  markdown: { syntaxHighlight: 'prism' },
  outDir: `./${paths.outDir}`,
  // The content store lives in cacheDir; one per mode avoids duplicate-slug warnings and staleness.
  cacheDir: `./node_modules/.astro-${mode}`,
  vite: {
    resolve: {
      alias: {
        '@site-config': fileURLToPath(new URL(`./${paths.siteConfig}`, import.meta.url)),
      },
    },
  },
});
