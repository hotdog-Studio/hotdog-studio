import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { placeholderClass } from '../../src/lib/photos';
import { photoManifestSchema } from '../../src/lib/photos-schema';
import type { Album, Photo, PhotoManifest } from '../../src/lib/photos-schema';
import { describeImage, photoId, writeDerivatives } from './derive';
import { mapExif, readExif, takenAt } from './exif';
import { PhotoPipelineError, scanPhotosDir } from './scan';

export type PipelineOptions = {
  sourceDir: string;
  includeDrafts: boolean;
  outputDir: string;
  manifestPath: string;
  placeholderCssPath: string;
  cacheDir: string;
};

export type PipelineResult = {
  manifest: PhotoManifest;
  warnings: string[];
  photos: number;
  photosWithAlt: number;
};

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Dated photos first, oldest to newest, then the undated ones. Ties, and photos with no date at
 * all, go by file name so the order never depends on the order the disk lists them in. The raw
 * EXIF timestamps are fixed-width strings, so comparing them as text is comparing them in time.
 */
export function orderPhotos<T extends { name: string; takenAt?: string | undefined }>(
  photos: readonly T[],
): T[] {
  return [...photos].sort((a, b) => {
    if (a.takenAt !== undefined && b.takenAt !== undefined) {
      return compare(a.takenAt, b.takenAt) || compare(a.name, b.name);
    }
    if (a.takenAt !== undefined) return -1;
    if (b.takenAt !== undefined) return 1;
    return compare(a.name, b.name);
  });
}

export const fallbackAlt = (albumTitle: string, position: number, total: number): string =>
  `${albumTitle}, photo ${position} of ${total}`;

/** One rule per distinct id, so the page shows a dominant-colour block while the image loads. */
export function placeholderCss(albums: readonly Album[]): string {
  const rules = new Map<string, string>();
  for (const album of albums) {
    for (const photo of album.photos) {
      rules.set(
        photo.id,
        `.${placeholderClass(photo.id)} { background-color: ${photo.dominantColor}; }`,
      );
    }
  }
  return [...rules.values()].join('\n') + '\n';
}

type Prepared = {
  name: string;
  bytes: Buffer;
  id: string;
  takenAt: string | undefined;
  exif: Photo['exif'];
  width: number;
  height: number;
  dominantColor: string;
  alt: string | undefined;
  caption: string | undefined;
};

/**
 * Scans, validates, then writes. Nothing touches the output until every check has passed, so a
 * failed run never leaves a half-cleaned `outputDir` behind.
 */
export async function runPhotoPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const scanned = (await scanPhotosDir(options.sourceDir)).filter(
    (album) => options.includeDrafts || !album.draft,
  );

  const prepared = new Map<string, Prepared[]>();
  const duplicates: string[] = [];
  // One photo at a time: libvips already uses every core per image, and it keeps the cache
  // entries from racing.
  for (const album of scanned) {
    const seen = new Map<string, string>();
    const photos: Prepared[] = [];
    for (const photo of album.photos) {
      // A buffer, never a path: on Windows sharp keeps path-opened files locked.
      const bytes = await readFile(photo.path);
      const id = photoId(bytes);
      const first = seen.get(id);
      if (first !== undefined) {
        duplicates.push(`${album.slug}: ${first} and ${photo.name} are the same photo`);
        continue;
      }
      seen.set(id, photo.name);
      const raw = await readExif(bytes);
      photos.push({
        name: photo.name,
        bytes,
        id,
        takenAt: takenAt(raw),
        exif: mapExif(raw),
        // The oriented size, so never-enlarge sees what a browser would display.
        ...(await describeImage(bytes)),
        alt: photo.alt,
        caption: photo.caption,
      });
    }
    prepared.set(album.slug, photos);
  }
  if (duplicates.length > 0) throw new PhotoPipelineError(options.sourceDir, duplicates);

  const warnings: string[] = [];
  let photoCount = 0;
  let photosWithAlt = 0;
  const albums: Album[] = [];
  const orderedByAlbum = new Map<string, Prepared[]>();
  for (const album of scanned) {
    const ordered = orderPhotos(prepared.get(album.slug) ?? []);
    orderedByAlbum.set(album.slug, ordered);
    const fallbacks: string[] = [];
    const finished: Photo[] = ordered.map((photo, index) => {
      photoCount += 1;
      const usesFallback = photo.alt === undefined;
      if (usesFallback) fallbacks.push(photo.name);
      else photosWithAlt += 1;
      return {
        id: photo.id,
        alt: photo.alt ?? fallbackAlt(album.title, index + 1, ordered.length),
        altIsFallback: usesFallback,
        ...(photo.caption === undefined ? {} : { caption: photo.caption }),
        width: photo.width,
        height: photo.height,
        dominantColor: photo.dominantColor,
        // Filled in once the derivatives exist.
        sources: { avif: [], webp: [] },
        ...(photo.exif === undefined ? {} : { exif: photo.exif }),
      };
    });
    if (fallbacks.length > 0) {
      warnings.push(
        `${album.slug}: no alt text in album.yaml for ${fallbacks.join(', ')}, so they use "${album.title}, photo n of m"`,
      );
    }
    const cover = album.coverName?.toLowerCase();
    const coverPhoto =
      cover === undefined ? undefined : ordered.find((p) => p.name.toLowerCase() === cover);
    albums.push({
      slug: album.slug,
      title: album.title,
      date: album.date,
      ...(album.description === undefined ? {} : { description: album.description }),
      showExif: album.showExif,
      coverId: (coverPhoto ?? ordered[0])?.id ?? '',
      photos: finished,
    });
  }

  // From here on the output changes.
  await rm(options.outputDir, { recursive: true, force: true });
  for (const album of albums) {
    const ordered = orderedByAlbum.get(album.slug) ?? [];
    for (const [index, photo] of ordered.entries()) {
      const target = album.photos[index];
      if (target === undefined) continue;
      target.sources = await writeDerivatives({
        bytes: photo.bytes,
        id: photo.id,
        album: album.slug,
        width: photo.width,
        outputDir: options.outputDir,
        cacheDir: options.cacheDir,
      });
    }
  }

  albums.sort((a, b) => compare(b.date, a.date) || compare(a.slug, b.slug));
  const manifest = photoManifestSchema.parse({ albums });
  await mkdir(dirname(options.manifestPath), { recursive: true });
  await writeFile(options.manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  await mkdir(dirname(options.placeholderCssPath), { recursive: true });
  await writeFile(options.placeholderCssPath, placeholderCss(manifest.albums));

  return { manifest, warnings, photos: photoCount, photosWithAlt };
}
