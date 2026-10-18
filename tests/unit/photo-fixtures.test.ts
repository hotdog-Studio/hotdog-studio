import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const ROOT = 'fixtures/photos';

// Collected at module level so that it.each can use the list.
const originals = readdirSync(ROOT, { recursive: true })
  .map(String)
  .filter((f) => f.toLowerCase().endsWith('.jpg'))
  .map((f) => path.join(ROOT, f));

// Negative control (spec 8.1 principle 3): the privacy checks in later tasks can
// only be trusted if these originals provably carry what those checks look for.
describe('fixture originals', { timeout: 60_000 }, () => {
  it('finds all six fixture originals', () => expect(originals).toHaveLength(6));

  it.each(originals)('%s carries the fake GPS position, body serial and artist', async (file) => {
    const bytes = await readFile(file);
    expect(await exifr.gps(bytes)).toEqual({ latitude: 0, longitude: 0 });
    const tags = await exifr.parse(bytes, { tiff: true, exif: true });
    // exifr names tag 0xA431 (BodySerialNumber) SerialNumber.
    expect(tags.SerialNumber).toBe('FIXTURE-SERIAL');
    expect(tags.Artist).toBe('Fixture Artist');
  });

  it('stores newer-2 sideways, tagged Orientation 6', async () => {
    const { width, height, orientation } = await sharp(
      'fixtures/photos/album-newer/newer-2.jpg',
    ).metadata();
    expect([width, height, orientation]).toEqual([900, 600, 6]);
  });
});
