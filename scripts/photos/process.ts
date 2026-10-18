/** The command-line entry point: `npm run photos`, and the first half of `dev` and `build`. */
import { resolveSiteMode } from '../../src/lib/site-mode';
import { runPhotoPipeline } from './pipeline';
import { resolvePhotoSource } from './source';

async function main(): Promise<void> {
  const dev = process.argv.includes('--dev');
  const source = resolvePhotoSource({
    mode: resolveSiteMode(process.env.SITE_MODE),
    dev,
    photosDir: process.env.PHOTOS_DIR,
  });
  console.log(`photos: using ${source.dir}${source.usingFixtures ? ' (fixture photos)' : ''}`);

  const result = await runPhotoPipeline({
    sourceDir: source.dir,
    // Only the dev server shows drafts; a build never reads, encodes or publishes them.
    includeDrafts: dev,
    outputDir: 'public/photos',
    manifestPath: 'src/generated/photos.json',
    placeholderCssPath: 'src/generated/photo-placeholders.css',
    cacheDir: process.env.PHOTOS_CACHE_DIR?.trim() || '.cache/photos',
  });
  for (const warning of result.warnings) console.warn(warning);
  console.log(
    `photos: ${result.manifest.albums.length} albums, ${result.photos} photos, ${result.photosWithAlt} with alt text`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
