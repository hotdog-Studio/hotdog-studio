import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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
    // Bait: newer-1 already carries GPS, a serial and an artist; add XMP and an ICC profile.
    const xmp = Buffer.from(
      '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
        '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
        '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>FIXTURE-XMP</dc:creator>' +
        '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>',
    );
    const bait = await sharp(await readFile(newer1))
      .keepExif()
      .withXmp(xmp.toString())
      .withIccProfile('p3')
      .jpeg()
      .toBuffer();
    // Preconditions: prove the bait can be detected, or the checks below prove nothing.
    const baitMeta = await sharp(bait).metadata();
    expect(baitMeta.exif).toBeDefined();
    expect(baitMeta.xmp).toBeDefined();
    expect(baitMeta.icc).toBeDefined();
    const markers = ['FIXTURE-SERIAL', 'Fixture Artist', 'FIXTURE-XMP'];
    for (const marker of markers) expect(bait.includes(marker)).toBe(true);

    const { out, result } = await run(bait, 1600);
    const sources = [...result.avif, ...result.webp];
    expect(sources).toHaveLength(6);
    for (const source of sources) {
      const bytes = await readFile(join(out, source.src.replace('/photos/', '')));
      const meta = await sharp(bytes).metadata();
      expect(meta.exif, source.src).toBeUndefined();
      expect(meta.xmp, source.src).toBeUndefined();
      // sharp cannot write IPTC, so there is no IPTC precondition; this only guards a regression.
      expect(meta.iptc, source.src).toBeUndefined();
      expect(meta.icc, source.src).toBeUndefined();
      for (const marker of markers)
        expect(bytes.includes(marker), `${source.src} ${marker}`).toBe(false);
    }
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
    const files = (await readdir(dir, { recursive: true })).filter((f) => /\.(m?ts|m?js)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    const forbidden =
      /\.(keep(Metadata|Exif|IccProfile|Xmp)|with(Metadata|Exif\w*|IccProfile|Xmp))\s*\(/;
    const offenders: string[] = [];
    for (const file of files) {
      const lines = (await readFile(join(dir, file), 'utf8')).split(/\r?\n/);
      lines.forEach((line, i) => {
        if (forbidden.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
