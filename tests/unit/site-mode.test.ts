import { describe, expect, it } from 'vitest';
import { modePaths, resolveSiteMode } from '../../src/lib/site-mode';

describe('resolveSiteMode', () => {
  it.each([undefined, '', 'real'])('treats %j as the real build', (value) => {
    expect(resolveSiteMode(value)).toBe('real');
  });
  it('selects the fixture build', () => {
    expect(resolveSiteMode('fixtures')).toBe('fixtures');
  });
  it.each(['fixture', 'FIXTURES', 'prod'])(
    'rejects %j instead of silently building real content',
    (value) => {
      expect(() => resolveSiteMode(value)).toThrow(
        `SITE_MODE must be "real" or "fixtures", got "${value}"`,
      );
    },
  );
});

describe('modePaths', () => {
  it('keeps the fixture build apart from the real one', () => {
    expect(modePaths.real).toEqual({
      contentDir: 'src/content',
      siteConfig: 'src/site.config.ts',
      outDir: 'dist',
    });
    expect(modePaths.fixtures).toEqual({
      contentDir: 'fixtures/content',
      siteConfig: 'fixtures/site.config.ts',
      outDir: 'dist-fixtures',
    });
  });
});
