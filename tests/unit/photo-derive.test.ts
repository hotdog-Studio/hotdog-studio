import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixtureImage } from '../../scripts/fixtures/fixture-image';
import {
  describeImage,
  photoId,
  PIPELINE_VERSION,
  widthLadder,
  writeDerivatives,
} from '../../scripts/photos/derive';
import { makeTempDir } from '../support/photo-albums';

const newer1 = join('fixtures', 'photos', 'album-newer', 'newer-1.jpg');
const newer2 = join('fixtures', 'photos', 'album-newer', 'newer-2.jpg');

const tempDirs: string[] = [];
async function temp(): Promise<string> {
  const dir = await makeTempDir();
  tempDirs.push(dir);
  return dir;
}
// Read through a buffer: sharp keeps path-based files open on Windows, which blocks cleanup.
const metaOf = async (path: string) => sharp(await readFile(path)).metadata();

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('widthLadder', () => {
  it.each([
    [3000, [480, 960, 1600, 2400]],
    [2400, [480, 960, 1600, 2400]],
    [2000, [480, 960, 1600, 2000]],
    [1600, [480, 960, 1600]],
    [1200, [480, 960, 1200]],
    [960, [480, 960]],
    [400, [400]],
  ])('gives the ladder for a %i px original', (width, expected) => {
    expect(widthLadder(width)).toEqual(expected);
  });
});

describe('photoId', () => {
  it('is the first 10 hex characters of the SHA-256', () => {
    expect(photoId(Buffer.from('abc'))).toBe('ba7816bf8f');
  });
  it('is stable for the same bytes and changes with one byte', () => {
    expect(photoId(Buffer.from('abc'))).toBe(photoId(Buffer.from('abc')));
    expect(photoId(Buffer.from('abd'))).not.toBe(photoId(Buffer.from('abc')));
  });
});

describe('describeImage', { timeout: 60_000 }, () => {
  it('reports the oriented size', async () => {
    const info = await describeImage(await readFile(newer2));
    expect([info.width, info.height]).toEqual([600, 900]);
  });
  it('reports the dominant colour as lower-case hex', async () => {
    const bytes = await sharp({
      create: { width: 64, height: 48, channels: 3, background: '#c89818' },
    })
      .png()
      .toBuffer();
    expect((await describeImage(bytes)).dominantColor).toBe('#c89818');
  });
});

describe('writeDerivatives', { timeout: 60_000 }, () => {
  async function run(bytes: Buffer, width: number, dirs?: { out: string; cache: string }) {
    const out = dirs?.out ?? (await temp());
    const cache = dirs?.cache ?? (await temp());
    const result = await writeDerivatives({
      bytes,
      id: photoId(bytes),
      album: 'demo',
      width,
      outputDir: out,
      cacheDir: cache,
    });
    return { out, cache, result, id: photoId(bytes) };
  }

  it('keeps the orientation upright', async () => {
    const { out, result } = await run(await readFile(newer2), 600);
    expect(result.avif.map((s) => s.w)).toEqual([480, 600]);
    for (const source of [...result.avif, ...result.webp]) {
      const meta = await metaOf(join(out, source.src.replace('/photos/', '')));
      expect(meta.width).toBe(source.w);
      expect(meta.height ?? 0).toBeGreaterThan(meta.width ?? Infinity);
    }
  });

  it('strips all metadata (§6.3)', async () => {
    const { out, result } = await run(await readFile(newer1), 1600);
    for (const source of [...result.avif, ...result.webp]) {
      const meta = await metaOf(join(out, source.src.replace('/photos/', '')));
      expect(meta.exif).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.iptc).toBeUndefined();
      expect(meta.icc).toBeUndefined();
    }
    const avif = result.avif[0];
    expect(avif).toBeDefined();
    const bytes = await readFile(join(out, (avif?.src ?? '').replace('/photos/', '')));
    expect(await exifr.gps(bytes)).toBeUndefined();
  });

  it('never enlarges', async () => {
    const bytes = await makeFixtureImage({ width: 400, height: 300, label: 'small' });
    const { out, id, result } = await run(bytes, 400);
    expect((await readdir(join(out, 'demo'))).sort()).toEqual([`${id}-400.avif`, `${id}-400.webp`]);
    expect(result.avif).toEqual([{ w: 400, src: `/photos/demo/${id}-400.avif` }]);
    for (const file of await readdir(join(out, 'demo'))) {
      expect((await metaOf(join(out, 'demo', file))).width).toBe(400);
    }
  });

  it('uses a cache hit instead of encoding', async () => {
    const bytes = await makeFixtureImage({ width: 400, height: 300, label: 'cached' });
    const id = photoId(bytes);
    const cache = await temp();
    await mkdir(join(cache, `v${PIPELINE_VERSION}`), { recursive: true });
    await writeFile(join(cache, `v${PIPELINE_VERSION}`, `${id}-400.webp`), 'CACHED');
    const { out } = await run(bytes, 400, { out: await temp(), cache });
    expect(await readFile(join(out, 'demo', `${id}-400.webp`), 'utf8')).toBe('CACHED');
    expect((await readdir(join(cache, `v${PIPELINE_VERSION}`))).sort()).toEqual([
      `${id}-400.avif`,
      `${id}-400.webp`,
    ]);
  });

  it("ignores another version's cache", async () => {
    const bytes = await makeFixtureImage({ width: 400, height: 300, label: 'old' });
    const id = photoId(bytes);
    const cache = await temp();
    await mkdir(join(cache, 'v0'), { recursive: true });
    await writeFile(join(cache, 'v0', `${id}-400.webp`), 'CACHED');
    const { out } = await run(bytes, 400, { out: await temp(), cache });
    const meta = await metaOf(join(out, 'demo', `${id}-400.webp`));
    expect(meta.format).toBe('webp');
  });
});

describe('pipeline source', () => {
  it('never asks sharp to keep metadata (§6.3)', async () => {
    const dir = join('scripts', 'photos');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = await readFile(join(dir, file), 'utf8');
      for (const call of [
        '.withMetadata(',
        '.keepMetadata(',
        '.keepExif(',
        '.withExif(',
        '.keepIccProfile(',
        '.withIccProfile(',
      ]) {
        expect(source, `${file} contains ${call}`).not.toContain(call);
      }
    }
  });
});
