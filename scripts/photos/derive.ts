/**
 * Photo ids, the width ladder and the metadata-free AVIF and WebP derivatives (spec §6.3).
 *
 * Privacy contract: sharp drops EXIF, XMP, IPTC and ICC data from its output unless asked to
 * keep it, so the encoders below are deliberately never given any metadata option. A unit test
 * scans this folder's source to make sure that stays true.
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { PhotoSource } from '../../src/lib/photos-schema';

/** Bump to invalidate every cached derivative when the encoder settings change. */
export const PIPELINE_VERSION = 1;
export const WIDTH_LADDER = [480, 960, 1600, 2400] as const;
const MAX_WIDTH = 2400;

/** Ladder widths below the original, plus the original's own width capped at the top rung. */
export function widthLadder(originalWidth: number): number[] {
  const top = Math.min(originalWidth, MAX_WIDTH);
  const widths = new Set<number>(WIDTH_LADDER.filter((w) => w < top));
  widths.add(top);
  return [...widths].sort((a, b) => a - b);
}

/** A content hash, so a re-export of the same pixels keeps its id and URL. */
export function photoId(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 10);
}

export async function describeImage(
  bytes: Buffer,
): Promise<{ width: number; height: number; dominantColor: string }> {
  const image = sharp(bytes);
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
  // autoOrient is the size after the EXIF rotation, which is what a browser displays.
  const size = metadata.autoOrient;
  if (!size) throw new Error('Could not read the image size.');
  const { r, g, b } = stats.dominant;
  const hex = (n: number): string => n.toString(16).padStart(2, '0');
  return { width: size.width, height: size.height, dominantColor: `#${hex(r)}${hex(g)}${hex(b)}` };
}

type Format = 'avif' | 'webp';

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function encode(bytes: Buffer, width: number, format: Format): Promise<Buffer> {
  const resized = sharp(bytes).rotate().toColorspace('srgb').resize({ width });
  return format === 'avif'
    ? resized.avif({ quality: 55, effort: 4 }).toBuffer()
    : resized.webp({ quality: 80 }).toBuffer();
}

export async function writeDerivatives(input: {
  bytes: Buffer;
  id: string;
  album: string;
  width: number;
  outputDir: string;
  cacheDir: string;
}): Promise<{ avif: PhotoSource[]; webp: PhotoSource[] }> {
  const { bytes, id, album, width, outputDir, cacheDir } = input;
  const cache = join(cacheDir, `v${PIPELINE_VERSION}`);
  const albumDir = join(outputDir, album);
  await mkdir(cache, { recursive: true });
  await mkdir(albumDir, { recursive: true });

  const result: { avif: PhotoSource[]; webp: PhotoSource[] } = { avif: [], webp: [] };
  for (const w of widthLadder(width)) {
    for (const format of ['avif', 'webp'] as const) {
      const name = `${id}-${w}.${format}`;
      const cached = join(cache, name);
      // AVIF encoding is slow, so an unchanged photo is only ever copied from the cache.
      if (!(await exists(cached))) await writeFile(cached, await encode(bytes, w, format));
      await copyFile(cached, join(albumDir, name));
      result[format].push({ w, src: `/photos/${album}/${name}` });
    }
  }
  return result;
}
