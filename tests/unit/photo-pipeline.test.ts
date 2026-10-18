import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixtureImage } from '../../scripts/fixtures/fixture-image';
import { photoId } from '../../scripts/photos/derive';
import { fallbackAlt, orderPhotos, runPhotoPipeline } from '../../scripts/photos/pipeline';
import { PhotoPipelineError } from '../../scripts/photos/scan';
import { FIXTURE_PHOTOS_DIR, resolvePhotoSource } from '../../scripts/photos/source';
import { photoManifestSchema } from '../../src/lib/photos-schema';
import { makeTempDir, writeAlbum } from '../support/photo-albums';

const tempDirs: string[] = [];
async function temp(): Promise<string> {
  const dir = await makeTempDir();
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const image = (label: string, takenAt?: string): Promise<Buffer> =>
  makeFixtureImage({
    width: 120,
    height: 80,
    label,
    exif: takenAt === undefined ? false : { takenAt },
  });

async function buildSource(root: string): Promise<void> {
  await writeAlbum(root, 'trip-b', {
    'album.yaml': [
      'title: Trip B',
      'date: 2025-06-14',
      'photos:',
      '  b-1.jpg:',
      '    alt: First',
      '  b-2.jpg:',
      '    alt: Second',
    ].join('\n'),
    'b-1.jpg': await image('b1', '2025:06:14 10:00:00'),
    'b-2.jpg': await image('b2', '2025:06:14 09:00:00'),
    'b-3.jpg': await image('b3'),
  });
  await writeAlbum(root, 'trip-a', {
    'album.yaml': [
      'title: Trip A',
      'date: 2024-01-01',
      'showExif: false',
      'cover: a-2.jpg',
      'photos:',
      '  a-1.jpg:',
      '    alt: One',
      '  a-2.jpg:',
      '    alt: Two',
    ].join('\n'),
    'a-1.jpg': await image('a1', '2024:01:01 10:00:00'),
    'a-2.jpg': await image('a2', '2024:01:01 11:00:00'),
  });
  await writeAlbum(root, 'trip-draft', {
    'album.yaml': ['title: Draft', 'date: 2026-01-01', 'draft: true'].join('\n'),
    'd-1.jpg': await image('d1'),
  });
}

function outputPaths(root: string) {
  return {
    outputDir: join(root, 'out', 'photos'),
    manifestPath: join(root, 'gen', 'nested', 'photos.json'),
    placeholderCssPath: join(root, 'gen', 'nested', 'photo-placeholders.css'),
    cacheDir: join(root, 'cache'),
  };
}

async function listAll(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true });
  return entries.map(String);
}

describe('photo pipeline', { timeout: 60_000 }, () => {
  describe('orderPhotos', () => {
    it('puts dated photos first, ascending', () => {
      const ordered = orderPhotos([
        { name: 'a', takenAt: '2025:01:02 00:00:00' },
        { name: 'b', takenAt: '2025:01:01 00:00:00' },
      ]);
      expect(ordered.map((p) => p.name)).toEqual(['b', 'a']);
    });

    it('puts undated photos after the dated ones, by name', () => {
      const ordered = orderPhotos([
        { name: 'z' },
        { name: 'a' },
        { name: 'm', takenAt: '2025:01:01 00:00:00' },
      ]);
      expect(ordered.map((p) => p.name)).toEqual(['m', 'a', 'z']);
    });

    it('orders equal timestamps by name', () => {
      const ordered = orderPhotos([
        { name: 'b', takenAt: '2025:01:01 00:00:00' },
        { name: 'a', takenAt: '2025:01:01 00:00:00' },
      ]);
      expect(ordered.map((p) => p.name)).toEqual(['a', 'b']);
    });

    it('orders by name when nothing is dated', () => {
      const ordered = orderPhotos([{ name: 'b' }, { name: 'c' }, { name: 'a' }]);
      expect(ordered.map((p) => p.name)).toEqual(['a', 'b', 'c']);
    });
  });

  it('builds the fallback alt text', () => {
    expect(fallbackAlt('Iceland 2025', 2, 5)).toBe('Iceland 2025, photo 2 of 5');
  });

  describe('resolvePhotoSource', () => {
    it.each([
      [
        'fixture mode ignores PHOTOS_DIR',
        'fixtures',
        false,
        'D:\\Photos',
        FIXTURE_PHOTOS_DIR,
        true,
      ],
      ['dev with it unset uses the fixtures', 'real', true, undefined, FIXTURE_PHOTOS_DIR, true],
      ['dev with it empty uses the fixtures', 'real', true, '', FIXTURE_PHOTOS_DIR, true],
      ['dev with it set uses that folder', 'real', true, 'D:\\Photos', 'D:\\Photos', false],
      ['a build with it set uses that folder', 'real', false, ' D:\\Photos ', 'D:\\Photos', false],
    ] as const)('%s', (_name, mode, dev, photosDir, dir, usingFixtures) => {
      expect(resolvePhotoSource({ mode, dev, photosDir })).toEqual({ dir, usingFixtures });
    });

    it.each([undefined, '', '  '])('a real build with %j throws', (photosDir) => {
      expect(() => resolvePhotoSource({ mode: 'real', dev: false, photosDir })).toThrow(
        'PHOTOS_DIR is not set',
      );
    });
  });

  describe('runPhotoPipeline', () => {
    it('builds a valid, ordered manifest', async () => {
      const root = await temp();
      const source = join(root, 'src');
      await buildSource(source);
      const options = { sourceDir: source, includeDrafts: false, ...outputPaths(root) };

      const result = await runPhotoPipeline(options);
      const manifest = photoManifestSchema.parse(
        JSON.parse(await readFile(options.manifestPath, 'utf8')),
      );
      expect(manifest).toEqual(result.manifest);
      expect(manifest.albums.map((a) => a.slug)).toEqual(['trip-b', 'trip-a']);

      const [tripB, tripA] = manifest.albums;
      if (!tripB || !tripA) throw new Error('expected two albums');
      expect(tripB.photos.map((p) => p.alt)).toEqual(['Second', 'First', 'Trip B, photo 3 of 3']);
      expect(tripB.photos.map((p) => p.altIsFallback)).toEqual([false, false, true]);
      expect(result.warnings.filter((w) => w.includes('b-3.jpg'))).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.photos).toBe(5);
      expect(result.photosWithAlt).toBe(4);

      const a2 = photoId(await readFile(join(source, 'trip-a', 'a-2.jpg')));
      expect(tripA.coverId).toBe(a2);
      expect(tripB.coverId).toBe(tripB.photos[0]?.id);
    });

    it('includes drafts only when asked', async () => {
      const root = await temp();
      const source = join(root, 'src');
      await buildSource(source);
      const result = await runPhotoPipeline({
        sourceDir: source,
        includeDrafts: true,
        ...outputPaths(root),
      });
      expect(result.manifest.albums.map((a) => a.slug)).toContain('trip-draft');
    });

    it('writes only published, anonymised output and the placeholder CSS', async () => {
      const root = await temp();
      const source = join(root, 'src');
      await buildSource(source);
      const options = { sourceDir: source, includeDrafts: false, ...outputPaths(root) };
      await mkdir(options.outputDir, { recursive: true });
      await writeFile(join(options.outputDir, 'stale.txt'), 'old');

      const { manifest } = await runPhotoPipeline(options);

      for (const album of manifest.albums) {
        for (const photo of album.photos) {
          for (const { src } of [...photo.sources.avif, ...photo.sources.webp]) {
            const onDisk = join(options.outputDir, src.replace('/photos/', ''));
            await expect(stat(onDisk)).resolves.toBeTruthy();
          }
        }
      }
      const names = await listAll(options.outputDir);
      expect(names).not.toContain('stale.txt');
      expect(names).not.toContain('trip-draft');
      const json = await readFile(options.manifestPath, 'utf8');
      for (const original of ['b-1.jpg', 'b-2.jpg', 'a-1.jpg']) {
        expect(json).not.toContain(original);
        expect(names.join('\n')).not.toContain(original);
      }
      expect(json.endsWith('}\n')).toBe(true);

      const css = await readFile(options.placeholderCssPath, 'utf8');
      for (const album of manifest.albums) {
        for (const photo of album.photos) {
          expect(css).toContain(`.ph-${photo.id} { background-color: ${photo.dominantColor}; }`);
        }
      }
    });

    it('fails on a duplicated export before writing anything', async () => {
      const root = await temp();
      const source = join(root, 'src');
      const same = await image('same');
      await writeAlbum(source, 'dupes', {
        'album.yaml': 'title: Dupes\ndate: 2025-01-01\n',
        'b-1.jpg': same,
        'b-1 (1).jpg': same,
      });
      const options = { sourceDir: source, includeDrafts: false, ...outputPaths(root) };
      await mkdir(options.outputDir, { recursive: true });
      await writeFile(join(options.outputDir, 'stale.txt'), 'old');

      const error = await runPhotoPipeline(options).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PhotoPipelineError);
      const message = (error as PhotoPipelineError).message;
      expect(message).toContain('b-1.jpg');
      expect(message).toContain('b-1 (1).jpg');
      expect(message).toContain('are the same photo');
      expect(await listAll(options.outputDir)).toEqual(['stale.txt']);
      await expect(stat(options.manifestPath)).rejects.toThrow();
    });
  });

  describe('unreadable images', () => {
    it('names the file, reports every problem together and writes nothing', async () => {
      const root = await temp();
      const source = join(root, 'src');
      const same = await image('same');
      await writeAlbum(source, 'broken', {
        'album.yaml': 'title: Broken\ndate: 2025-01-01\n',
        'bad.jpg': 'not an image',
      });
      await writeAlbum(source, 'dupes', {
        'album.yaml': 'title: Dupes\ndate: 2025-01-02\n',
        'one.jpg': same,
        'two.jpg': same,
      });
      const options = { sourceDir: source, includeDrafts: false, ...outputPaths(root) };
      await mkdir(options.outputDir, { recursive: true });
      await writeFile(join(options.outputDir, 'stale.txt'), 'old');

      const error = await runPhotoPipeline(options).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PhotoPipelineError);
      const message = (error as PhotoPipelineError).message;
      expect(message).toContain('broken/bad.jpg: could not read the image');
      expect(message).toContain('dupes: one.jpg and two.jpg are the same photo');
      expect(await listAll(options.outputDir)).toEqual(['stale.txt']);
    });

    it('never reads the photos of a draft album that is left out', async () => {
      const root = await temp();
      const source = join(root, 'src');
      await buildSource(source);
      await writeAlbum(source, 'draft-broken', {
        'album.yaml': 'title: Draft broken\ndate: 2026-02-01\ndraft: true\n',
        'bad.jpg': 'not an image',
      });
      const result = await runPhotoPipeline({
        sourceDir: source,
        includeDrafts: false,
        ...outputPaths(root),
      });
      expect(result.manifest.albums.map((a) => a.slug)).toEqual(['trip-b', 'trip-a']);
    });
  });

  describe('the CLI', () => {
    const run = (photosDir: string) =>
      spawnSync(process.execPath, ['--import', 'tsx', 'scripts/photos/process.ts'], {
        env: { ...process.env, SITE_MODE: 'real', PHOTOS_DIR: photosDir },
        encoding: 'utf8',
      });

    it('fails when PHOTOS_DIR is empty', () => {
      const result = run('');
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('PHOTOS_DIR is not set');
    });

    it('fails when PHOTOS_DIR does not exist', async () => {
      const root = await temp();
      const result = run(join(root, 'missing'));
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('does not exist');
    });
  });
});
