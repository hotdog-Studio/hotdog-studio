import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeFixtureImage } from '../../scripts/fixtures/fixture-image';
import { EXIF_TAGS, mapExif, readExif, takenAt } from '../../scripts/photos/exif';

const full = {
  Make: 'SONY',
  Model: 'ILCE-7M3',
  LensModel: 'FE 35mm F1.8',
  FocalLength: 35,
  FNumber: 1.8,
  ExposureTime: 0.004,
  ISO: 100,
  DateTimeOriginal: '2025:06:14 09:30:00',
};

const expected = {
  camera: 'SONY ILCE-7M3',
  lens: 'FE 35mm F1.8',
  focalLength: '35 mm',
  aperture: 'f/1.8',
  shutter: '1/250 s',
  iso: 100,
  takenOn: '2025-06-14',
};

describe('mapExif', { timeout: 60_000 }, () => {
  it('maps every allowlisted tag', () => {
    expect(mapExif(full)).toEqual(expected);
  });

  it('passes nothing else through', () => {
    const bait = {
      ...full,
      latitude: 0,
      longitude: 0,
      GPSLatitude: [0, 0, 0],
      SerialNumber: 'X',
      BodySerialNumber: 'X',
      Artist: 'A',
      OwnerName: 'O',
      Orientation: 6,
    };
    expect(mapExif(bait)).toEqual(expected);
  });

  it.each([
    [{ Make: 'Canon', Model: 'Canon EOS R5' }, 'Canon EOS R5'],
    [{ Make: 'NIKON CORPORATION', Model: 'NIKON Z 6' }, 'NIKON Z 6'],
    [{ Make: 'SONY', Model: 'ILCE-7M3' }, 'SONY ILCE-7M3'],
    [{ Make: 'SONY' }, 'SONY'],
    [{ Model: 'ILCE-7M3' }, 'ILCE-7M3'],
    [{ Make: '  SONY ', Model: ' ILCE-7M3 ' }, 'SONY ILCE-7M3'],
  ])('names the camera from %j as %s', (raw, camera) => {
    expect(mapExif(raw)?.camera).toBe(camera);
  });

  it.each([
    [0.004, '1/250 s'],
    [1 / 3, '1/3 s'],
    [0.5, '1/2 s'],
    [1, '1 s'],
    [2.5, '2.5 s'],
    [30, '30 s'],
    [0.8, '0.8 s'],
    [0.6, '0.6 s'],
    [0.4, '0.4 s'],
    [0.99, '1 s'],
  ])('formats a shutter speed of %f as %s', (ExposureTime, shutter) => {
    expect(mapExif({ ExposureTime })?.shutter).toBe(shutter);
  });

  it.each([
    [1.8, 'f/1.8'],
    [2, 'f/2'],
    [5.6, 'f/5.6'],
    [11, 'f/11'],
  ])('formats an aperture of %f as %s', (FNumber, aperture) => {
    expect(mapExif({ FNumber })?.aperture).toBe(aperture);
  });

  it.each([
    [35, '35 mm'],
    [23.6, '24 mm'],
  ])('formats a focal length of %f as %s', (FocalLength, focalLength) => {
    expect(mapExif({ FocalLength })?.focalLength).toBe(focalLength);
  });

  it('keeps the date of takenOn and drops the time', () => {
    const mapped = mapExif({ DateTimeOriginal: '2025:06:14 23:59:59' });
    expect(mapped).toEqual({ takenOn: '2025-06-14' });
    expect(JSON.stringify(mapped)).not.toContain('23');
  });

  it.each(['0000:00:00 00:00:00', 'garbage'])('leaves out the date for %j', (DateTimeOriginal) => {
    expect(mapExif({ DateTimeOriginal })).toBeUndefined();
    expect(takenAt({ DateTimeOriginal })).toBeUndefined();
  });

  it('leaves out takenOn for an impossible calendar date', () => {
    expect(mapExif({ DateTimeOriginal: '2025:13:40 10:00:00' })).toBeUndefined();
  });

  it('takenAt returns the full timestamp for a valid one', () => {
    expect(takenAt(full)).toBe('2025:06:14 09:30:00');
    expect(takenAt(undefined)).toBeUndefined();
  });

  it.each([
    [{ FNumber: 'abc' }, 'aperture'],
    [{ ISO: 0 }, 'iso'],
    [{ ISO: -5 }, 'iso'],
  ])('skips a wrong-typed or invalid value %j', (raw, key) => {
    expect(mapExif({ ...full, ...raw })).not.toHaveProperty(key);
  });

  it('gives undefined when nothing survives', () => {
    expect(mapExif({})).toBeUndefined();
    expect(mapExif(undefined)).toBeUndefined();
  });
});

describe('readExif', { timeout: 60_000 }, () => {
  it('reads only the allowlisted tags from a real file', async () => {
    const raw = await readExif(readFileSync('fixtures/photos/album-newer/newer-1.jpg'));
    expect(raw).toBeDefined();
    const allowed: readonly string[] = EXIF_TAGS;
    for (const key of Object.keys(raw ?? {})) expect(allowed).toContain(key);
    expect(raw?.DateTimeOriginal).toBe('2025:06:14 09:30:00');
  });

  it.each(['png', 'webp'] as const)('gives undefined for a %s without EXIF', async (format) => {
    const bytes = await makeFixtureImage({
      width: 64,
      height: 48,
      label: 'x',
      format,
      exif: false,
    });
    await expect(readExif(bytes)).resolves.toBeUndefined();
  });
});
