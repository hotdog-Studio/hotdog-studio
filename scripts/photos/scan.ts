import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { z } from 'astro/zod';
import { parse } from 'yaml';

/** The image types the pipeline accepts, compared in lower case. */
export const SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
]);

/** Album folder names become URLs, so they are limited to what a URL segment keeps as written. */
export const ALBUM_SLUG = /^[a-z0-9-]+$/;

const ALBUM_FILE = 'album.yaml';
const SUPPORTED_LIST = [...SUPPORTED_EXTENSIONS].join(' ');

/**
 * True for hidden files and the system entries Windows and NAS shares scatter about. Anything
 * starting with `.`, `@` or `#` is skipped (`.DS_Store`, `@eaDir`, `#recycle`), plus `Thumbs.db`
 * and `desktop.ini` in any case.
 */
export function isIgnoredEntry(name: string): boolean {
  const lower = name.toLowerCase();
  return /^[.@#]/.test(name) || lower === 'thumbs.db' || lower === 'desktop.ini';
}

/** Text a person has to write. An empty string satisfies `z.string()` but says nothing. */
const nonEmpty = () => z.string().min(1, { error: 'Must not be empty' });

export const albumConfigSchema = z.strictObject({
  title: nonEmpty(),
  date: z.iso.date({ error: 'Must be a date written YYYY-MM-DD' }),
  description: nonEmpty().optional(),
  cover: nonEmpty().optional(),
  showExif: z.boolean().default(true),
  draft: z.boolean().default(false),
  photos: z
    .record(
      z.string(),
      z.strictObject({ alt: nonEmpty().optional(), caption: nonEmpty().optional() }),
    )
    .default({}),
});
export type AlbumConfig = z.infer<typeof albumConfigSchema>;

/** Every problem found in the photo folder, reported together so one run shows them all. */
export class PhotoPipelineError extends Error {
  readonly problems: readonly string[];

  constructor(dir: string, problems: readonly string[]) {
    super(
      [
        `Photo pipeline: ${problems.length} problem(s) in ${dir}:`,
        ...problems.map((p) => `- ${p}`),
      ].join('\n'),
    );
    this.name = 'PhotoPipelineError';
    this.problems = problems;
  }
}

export type ScannedPhoto = {
  /** The filename exactly as it is on disk. */
  name: string;
  /** Absolute. */
  path: string;
  alt?: string | undefined;
  caption?: string | undefined;
};

export type ScannedAlbum = {
  slug: string;
  title: string;
  date: string;
  description?: string | undefined;
  showExif: boolean;
  draft: boolean;
  coverName?: string | undefined;
  /** Sorted by name. */
  photos: ScannedPhoto[];
};

const isNotFound = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** `album.yaml` problems, or the parsed config. A syntax error keeps the parser's line and column. */
async function readConfig(
  slug: string,
  file: string,
): Promise<{ config: AlbumConfig } | { problems: string[] }> {
  const label = `${slug}/${ALBUM_FILE}`;
  let data: unknown;
  try {
    // `yaml` ignores a leading BOM and CRLF line endings, and keeps `2025-06-14` as a string.
    data = parse(await readFile(file, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message.trimEnd() : String(error);
    return { problems: [`${label}: ${reason}`] };
  }
  const result = albumConfigSchema.safeParse(data);
  if (result.success) return { config: result.data };
  return {
    problems: result.error.issues.map((issue) => {
      const path = issue.path.map(String).join('.');
      return path === '' ? `${label}: ${issue.message}` : `${label}: ${path}: ${issue.message}`;
    }),
  };
}

/** Checks one album folder and returns it, or the problems in it. */
async function scanAlbum(
  dir: string,
  slug: string,
): Promise<{ album: ScannedAlbum } | { problems: string[] }> {
  const albumDir = join(dir, slug);
  const entries = (await readdir(albumDir, { withFileTypes: true })).filter(
    (entry) => !isIgnoredEntry(entry.name),
  );
  const problems: string[] = [];

  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const files = entries.filter((entry) => !entry.isDirectory()).map((entry) => entry.name);

  let config: AlbumConfig | undefined;
  if (files.includes(ALBUM_FILE)) {
    const read = await readConfig(slug, join(albumDir, ALBUM_FILE));
    if ('config' in read) config = read.config;
    else problems.push(...read.problems);
  } else {
    problems.push(`${slug}: ${ALBUM_FILE} is missing`);
  }

  const photoNames = files
    .filter((name) => SUPPORTED_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort(byCodeUnit);
  const unsupported = files
    .filter((name) => name !== ALBUM_FILE && !photoNames.includes(name))
    .sort(byCodeUnit);

  if (unsupported.length > 0) {
    problems.push(
      `${slug}: unsupported files (export JPEG, PNG, TIFF or WebP from your editor first): ${unsupported.join(', ')}`,
    );
  }
  if (folders.length > 0) {
    problems.push(
      `${slug}: folders inside an album are not allowed: ${folders.sort(byCodeUnit).join(', ')}`,
    );
  }
  if (photoNames.length === 0) {
    problems.push(`${slug}: no photos (supported: ${SUPPORTED_LIST})`);
  }

  // Cameras write `DSC01234.JPG` and people write `dsc01234.jpg`, so names match in lower case.
  const byLower = new Map<string, string>();
  const clashes = new Set<string>();
  for (const name of photoNames) {
    const lower = name.toLowerCase();
    const first = byLower.get(lower);
    if (first === undefined) byLower.set(lower, name);
    else {
      clashes.add(first);
      clashes.add(name);
    }
  }
  if (clashes.size > 0) {
    problems.push(`${slug}: these files differ only in letter case: ${[...clashes].join(', ')}`);
  }

  if (config === undefined) return { problems };

  const label = `${slug}/${ALBUM_FILE}`;
  let coverName: string | undefined;
  if (config.cover !== undefined) {
    coverName = byLower.get(config.cover.toLowerCase());
    if (coverName === undefined) {
      problems.push(`${label}: cover "${config.cover}" is not a photo in this album`);
    }
  }
  const extras = new Map<string, { alt?: string | undefined; caption?: string | undefined }>();
  const keyFor = new Map<string, string>();
  for (const [key, extra] of Object.entries(config.photos)) {
    const name = byLower.get(key.toLowerCase());
    if (name === undefined) {
      problems.push(`${label}: photos."${key}" is not a photo in this album`);
      continue;
    }
    const earlier = keyFor.get(name);
    if (earlier !== undefined) {
      problems.push(`${label}: photos."${earlier}" and photos."${key}" both name ${name}`);
      continue;
    }
    keyFor.set(name, key);
    extras.set(name, extra);
  }
  if (problems.length > 0) return { problems };

  return {
    album: {
      slug,
      title: config.title,
      date: config.date,
      description: config.description,
      showExif: config.showExif,
      draft: config.draft,
      coverName,
      photos: photoNames.map((name) => ({
        name,
        path: resolve(albumDir, name),
        ...extras.get(name),
      })),
    },
  };
}

/**
 * Finds the albums in `dir` and checks their folder names, `album.yaml`, files, cover and
 * `photos:` keys. It reads only directory listings and `album.yaml`, never image bytes, and it
 * never writes. Every problem in every album is collected and thrown as one `PhotoPipelineError`.
 */
export async function scanPhotosDir(dir: string): Promise<ScannedAlbum[]> {
  let entries;
  try {
    if (!(await stat(dir)).isDirectory())
      throw new PhotoPipelineError(dir, [`${dir} does not exist`]);
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof PhotoPipelineError) throw error;
    if (isNotFound(error)) throw new PhotoPipelineError(dir, [`${dir} does not exist`]);
    throw error;
  }

  // Plain files at the top level are ignored; so are system folders such as `@eaDir`.
  const folders = entries
    .filter((entry) => entry.isDirectory() && !isIgnoredEntry(entry.name))
    .map((entry) => entry.name)
    .sort(byCodeUnit);
  if (folders.length === 0) {
    throw new PhotoPipelineError(dir, [`${dir} contains no album folders`]);
  }

  const problems: string[] = [];
  const albums: ScannedAlbum[] = [];
  for (const slug of folders) {
    if (!ALBUM_SLUG.test(slug)) {
      problems.push(
        `"${slug}": album folder names may only use lowercase letters, digits and hyphens`,
      );
      continue;
    }
    const result = await scanAlbum(dir, slug);
    if ('album' in result) albums.push(result.album);
    else problems.push(...result.problems);
  }
  if (problems.length > 0) throw new PhotoPipelineError(dir, problems);
  return albums;
}
