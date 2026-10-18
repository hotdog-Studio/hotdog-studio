import { rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ALBUM_SLUG,
  PhotoPipelineError,
  SUPPORTED_EXTENSIONS,
  isIgnoredEntry,
  scanPhotosDir,
} from '../../scripts/photos/scan';
import { makeTempDir, writeAlbum } from '../support/photo-albums';

const YAML = 'title: Iceland\ndate: 2025-06-14\n';

let root: string;
beforeEach(async () => {
  root = await makeTempDir();
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Runs the scan, expects it to fail, and returns the problems. */
async function problemsOf(dir = root): Promise<readonly string[]> {
  const error = await scanPhotosDir(dir).then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PhotoPipelineError);
  return (error as PhotoPipelineError).problems;
}

describe('constants', () => {
  it('lists the supported extensions and the slug pattern', () => {
    expect([...SUPPORTED_EXTENSIONS].sort()).toEqual(
      ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'].sort(),
    );
    expect(ALBUM_SLUG.test('iceland-2025')).toBe(true);
    expect(ALBUM_SLUG.test('Iceland 2025')).toBe(false);
  });

  it('ignores system entries in any case', () => {
    const names = ['.DS_Store', '@eaDir', '#recycle', 'Thumbs.db', 'THUMBS.DB', 'desktop.ini'];
    for (const name of names) expect(isIgnoredEntry(name)).toBe(true);
    expect(isIgnoredEntry('DSC01.jpg')).toBe(false);
  });
});

describe('scanPhotosDir', () => {
  it('reads a valid album', async () => {
    await writeAlbum(root, 'iceland', {
      'album.yaml': `${YAML}description: Summer\ncover: b.jpg\nphotos:\n  b.jpg:\n    alt: A bay\n    caption: Morning\n`,
      'b.jpg': '',
      'a.jpg': '',
    });
    expect(await scanPhotosDir(root)).toEqual([
      {
        slug: 'iceland',
        title: 'Iceland',
        date: '2025-06-14',
        description: 'Summer',
        showExif: true,
        draft: false,
        coverName: 'b.jpg',
        photos: [
          { name: 'a.jpg', path: resolve(root, 'iceland', 'a.jpg') },
          {
            name: 'b.jpg',
            path: resolve(root, 'iceland', 'b.jpg'),
            alt: 'A bay',
            caption: 'Morning',
          },
        ],
      },
    ]);
  });

  it('returns albums sorted by slug', async () => {
    await writeAlbum(root, 'b', { 'album.yaml': YAML, 'x.jpg': '' });
    await writeAlbum(root, 'a', { 'album.yaml': YAML, 'x.jpg': '' });
    expect((await scanPhotosDir(root)).map((a) => a.slug)).toEqual(['a', 'b']);
  });

  it('accepts every supported extension in any case', async () => {
    const names = ['a.jpg', 'b.JPG', 'c.jpeg', 'd.png', 'e.tif', 'f.tiff', 'g.WEBP'];
    await writeAlbum(root, 'ext', {
      'album.yaml': YAML,
      ...Object.fromEntries(names.map((n) => [n, ''])),
    });
    const [album] = await scanPhotosDir(root);
    expect(album?.photos.map((p) => p.name)).toEqual(names);
  });

  it('matches cover and photos keys to filenames without regard to case', async () => {
    await writeAlbum(root, 'cam', {
      'album.yaml': `${YAML}cover: dsc01234.jpg\nphotos:\n  DSC01234.jpg:\n    alt: A bay\n`,
      'DSC01234.JPG': '',
    });
    const [album] = await scanPhotosDir(root);
    expect(album?.coverName).toBe('DSC01234.JPG');
    expect(album?.photos[0]?.alt).toBe('A bay');
  });

  it('ignores Windows, NAS and hidden entries', async () => {
    await writeAlbum(root, 'real', {
      'album.yaml': YAML,
      'a.jpg': '',
      '.DS_Store': '',
      'Thumbs.db': '',
      'THUMBS.DB': '',
      'desktop.ini': '',
      '@eaDir/': '',
    });
    await writeAlbum(root, '@eaDir', { 'x.jpg': '' });
    await writeAlbum(root, '#recycle', { 'x.jpg': '' });
    await writeAlbum(root, '.hidden', { 'x.jpg': '' });
    await writeFile(join(root, 'README.txt'), 'hi');
    expect((await scanPhotosDir(root)).map((a) => a.slug)).toEqual(['real']);
  });

  it('parses an album.yaml saved with a BOM and CRLF line endings', async () => {
    await writeAlbum(root, 'win', {
      'album.yaml': '﻿title: Iceland\r\ndate: 2025-06-14\r\n',
      'a.jpg': '',
    });
    const [album] = await scanPhotosDir(root);
    expect(album?.title).toBe('Iceland');
    expect(album?.date).toBe('2025-06-14');
  });
});

describe('problems', () => {
  it('lists every unsupported file in one message', async () => {
    await writeAlbum(root, 'raw', {
      'album.yaml': YAML,
      'a.jpg': '',
      'DSC1.ARW': '',
      'IMG_2.HEIC': '',
      'notes.txt': '',
    });
    const problems = await problemsOf();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(
      'raw: unsupported files (export JPEG, PNG, TIFF or WebP from your editor first): ',
    );
    for (const name of ['DSC1.ARW', 'IMG_2.HEIC', 'notes.txt']) {
      expect(problems[0]).toContain(name);
    }
  });

  it('reports a bad album folder name', async () => {
    await writeAlbum(root, 'Iceland 2025', { 'album.yaml': YAML, 'a.jpg': '' });
    expect(await problemsOf()).toContain(
      '"Iceland 2025": album folder names may only use lowercase letters, digits and hyphens',
    );
  });

  it('reports a missing album.yaml', async () => {
    await writeAlbum(root, 'iceland', { 'a.jpg': '' });
    expect(await problemsOf()).toContain('iceland: album.yaml is missing');
  });

  it('reports a YAML syntax error with its position', async () => {
    await writeAlbum(root, 'iceland', { 'album.yaml': 'title: [unclosed\n', 'a.jpg': '' });
    const problems = await problemsOf();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^iceland\/album\.yaml: .*line \d+, column \d+/s);
  });

  it('reports an unknown key', async () => {
    await writeAlbum(root, 'iceland', { 'album.yaml': `${YAML}Title: Oops\n`, 'a.jpg': '' });
    const problems = await problemsOf();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^iceland\/album\.yaml: .*Title/);
  });

  it('reports a bad date, naming the field', async () => {
    await writeAlbum(root, 'iceland', {
      'album.yaml': 'title: Iceland\ndate: 2025-06\n',
      'a.jpg': '',
    });
    const problems = await problemsOf();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^iceland\/album\.yaml: date: /);
  });

  it('reports a cover that is not a photo', async () => {
    await writeAlbum(root, 'iceland', { 'album.yaml': `${YAML}cover: nope.jpg\n`, 'a.jpg': '' });
    expect(await problemsOf()).toContain(
      'iceland/album.yaml: cover "nope.jpg" is not a photo in this album',
    );
  });

  it('reports a photos key that is not a photo', async () => {
    await writeAlbum(root, 'iceland', {
      'album.yaml': `${YAML}photos:\n  ghost.jpg:\n    alt: x\n`,
      'a.jpg': '',
    });
    expect(await problemsOf()).toContain(
      'iceland/album.yaml: photos."ghost.jpg" is not a photo in this album',
    );
  });

  it('reports an album with no photos', async () => {
    await writeAlbum(root, 'iceland', { 'album.yaml': YAML });
    expect(await problemsOf()).toContain(
      'iceland: no photos (supported: .jpg .jpeg .png .tif .tiff .webp)',
    );
  });

  it('reports a nested folder', async () => {
    await writeAlbum(root, 'iceland', { 'album.yaml': YAML, 'a.jpg': '', 'selects/': '' });
    expect(await problemsOf()).toContain(
      'iceland: folders inside an album are not allowed: selects',
    );
  });

  it('collects problems from two albums in one error', async () => {
    await writeAlbum(root, 'one', { 'a.jpg': '' });
    await writeAlbum(root, 'two', { 'album.yaml': YAML });
    const error = await scanPhotosDir(root).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PhotoPipelineError);
    const { problems, message } = error as PhotoPipelineError;
    expect(problems).toHaveLength(2);
    expect(message).toBe(
      `Photo pipeline: 2 problem(s) in ${root}:\n- ${problems[0]}\n- ${problems[1]}`,
    );
  });

  it('reports a folder that does not exist', async () => {
    const missing = join(root, 'nope');
    expect(await problemsOf(missing)).toEqual([`${missing} does not exist`]);
  });

  it('reports a path that is a file as not existing', async () => {
    const file = join(root, 'f.txt');
    await writeFile(file, '');
    expect(await problemsOf(file)).toEqual([`${file} does not exist`]);
  });

  it('reports a folder holding only ignored entries', async () => {
    await writeAlbum(root, '@eaDir', {});
    await writeFile(join(root, 'Thumbs.db'), '');
    expect(await problemsOf()).toEqual([`${root} contains no album folders`]);
  });
});
