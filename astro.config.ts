import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { modePaths, resolveSiteMode } from './src/lib/site-mode';

const paths = modePaths[resolveSiteMode(process.env.SITE_MODE)];

export default defineConfig({
  site: 'https://hotdog.studio',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory', inlineStylesheets: 'never' },
  markdown: { syntaxHighlight: 'prism' },
  outDir: `./${paths.outDir}`,
  vite: {
    resolve: {
      alias: {
        '@site-config': fileURLToPath(new URL(`./${paths.siteConfig}`, import.meta.url)),
      },
    },
  },
});
