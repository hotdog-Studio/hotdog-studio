import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { photoManifestSchema, type PhotoManifest } from './photos-schema';

/**
 * Read at build time, from disk, and never imported: the file is a build output, so an import
 * would break `astro check` and the component tests, which run before the pipeline does.
 */
export async function loadPhotoManifest(): Promise<PhotoManifest> {
  const file = path.resolve(process.cwd(), 'src/generated/photos.json');
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'src/generated/photos.json is missing. Run npm run photos, or npm run dev or npm run build, which run it first.',
        { cause: error },
      );
    }
    throw error;
  }
  return photoManifestSchema.parse(JSON.parse(text));
}
