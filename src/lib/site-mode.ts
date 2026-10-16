export type SiteMode = 'real' | 'fixtures';

/**
 * Turns the `SITE_MODE` environment variable into a build mode.
 *
 * Unset and empty both mean the real build, because CI systems can export an empty variable.
 * Anything unrecognised throws, so a typo can never silently build the real content.
 */
export function resolveSiteMode(value: string | undefined): SiteMode {
  switch (value) {
    case undefined:
    case '':
    case 'real':
      return 'real';
    case 'fixtures':
      return 'fixtures';
    default:
      throw new Error(`SITE_MODE must be "real" or "fixtures", got "${value}"`);
  }
}

/** Where each mode reads its content and site config from, and where it writes its output. */
export const modePaths = {
  real: { contentDir: 'src/content', siteConfig: 'src/site.config.ts', outDir: 'dist' },
  fixtures: {
    contentDir: 'fixtures/content',
    siteConfig: 'fixtures/site.config.ts',
    outDir: 'dist-fixtures',
  },
} as const satisfies Record<SiteMode, { contentDir: string; siteConfig: string; outDir: string }>;
