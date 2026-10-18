import type { SiteMode } from '../../src/lib/site-mode';

export const FIXTURE_PHOTOS_DIR = 'fixtures/photos';

/**
 * Chooses the folder of albums to process (spec §6.6). The fixtures are only ever a stand-in for
 * the real photos while developing: a real build with no PHOTOS_DIR must stop rather than publish
 * made-up photos under Thomas's name.
 */
export function resolvePhotoSource(input: {
  mode: SiteMode;
  dev: boolean;
  photosDir: string | undefined;
}): { dir: string; usingFixtures: boolean } {
  const photosDir = input.photosDir?.trim() ?? '';
  if (input.mode === 'fixtures') return { dir: FIXTURE_PHOTOS_DIR, usingFixtures: true };
  if (photosDir !== '') return { dir: photosDir, usingFixtures: false };
  if (input.dev) return { dir: FIXTURE_PHOTOS_DIR, usingFixtures: true };
  throw new Error(
    "PHOTOS_DIR is not set. The real build publishes your own photos, so it never falls back to the fixture photos. Set PHOTOS_DIR to the folder that holds your album folders, for example in PowerShell: $env:PHOTOS_DIR = 'D:\\Photos\\hotdog-studio'",
  );
}
