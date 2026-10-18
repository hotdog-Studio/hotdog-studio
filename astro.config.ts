import { fileURLToPath } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import { defineConfig } from 'astro/config';
import { focusablePre } from './src/lib/focusable-pre';
import { modePaths, resolveSiteMode } from './src/lib/site-mode';

const mode = resolveSiteMode(process.env.SITE_MODE);
const paths = modePaths[mode];

export default defineConfig({
  site: 'https://hotdog.studio',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory', inlineStylesheets: 'never' },
  markdown: { syntaxHighlight: 'prism', processor: satteri({ hastPlugins: [focusablePre] }) },
  outDir: `./${paths.outDir}`,
  // Astro keeps the content store in cacheDir for `astro build` and `astro check`, so one directory
  // per mode avoids duplicate-slug warnings and stale entries. `astro dev` uses `.astro/`.
  cacheDir: `./node_modules/.astro-${mode}`,
  vite: {
    // Astro inlines any script smaller than this many bytes into the page, and `script-src 'self'`
    // (spec §10.2) blocks an inline script. At 0, the lightbox always ships as its own file.
    build: { assetsInlineLimit: 0 },
    resolve: {
      alias: {
        '@site-config': fileURLToPath(new URL(`./${paths.siteConfig}`, import.meta.url)),
      },
    },
  },
});
