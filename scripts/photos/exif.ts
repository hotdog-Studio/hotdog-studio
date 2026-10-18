/**
 * The EXIF allowlist (spec §6.2).
 *
 * Privacy contract: only the tags in EXIF_TAGS are ever read from an original, and only
 * formatted display fields leave this module. GPS, serial numbers, owner and artist names
 * and the time of day never reach the manifest.
 */
import exifr from 'exifr';
import type { PhotoExif } from '../../src/lib/photos-schema';

export const EXIF_TAGS = [
  'Make',
  'Model',
  'LensModel',
  'FocalLength',
  'FNumber',
  'ExposureTime',
  'ISO',
  'DateTimeOriginal',
] as const;

export type RawExif = Record<string, unknown>;

/**
 * Reads the allowlisted tags only. EXIF just feeds the display, so a file exifr cannot
 * parse (it throws on WebP without EXIF) yields undefined rather than failing the build.
 */
export async function readExif(bytes: Buffer): Promise<RawExif | undefined> {
  try {
    // reviveValues: false keeps DateTimeOriginal as the raw string; the default builds a
    // local-time Date, which shifts the timestamp by the machine's UTC offset.
    const parse = exifr.parse as (
      input: Buffer,
      options: { pick: string[]; reviveValues: boolean },
    ) => Promise<RawExif | undefined>;
    return (await parse(bytes, { pick: [...EXIF_TAGS], reviveValues: false })) ?? undefined;
  } catch {
    return undefined;
  }
}

const TIMESTAMP = /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/;

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function positive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function cameraName(make: string | undefined, model: string | undefined): string | undefined {
  if (make === undefined || model === undefined) return model ?? make;
  // Many makers repeat themselves in the model ("Canon" + "Canon EOS R5").
  const firstWord = (s: string): string => (s.split(/\s+/)[0] ?? '').toLowerCase();
  return firstWord(make) === firstWord(model) ? model : `${make} ${model}`;
}

/** The raw timestamp, used only to order photos. It is never written out. */
export function takenAt(raw: RawExif | undefined): string | undefined {
  const value = raw?.DateTimeOriginal;
  if (typeof value !== 'string' || !TIMESTAMP.test(value)) return undefined;
  return value.startsWith('0000:00:00') ? undefined : value;
}

function takenOn(raw: RawExif | undefined): string | undefined {
  const stamp = takenAt(raw);
  if (stamp === undefined) return undefined;
  const [y = 0, m = 0, d = 0] = stamp.slice(0, 10).split(':').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const real =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return real ? stamp.slice(0, 10).replaceAll(':', '-') : undefined;
}

export function mapExif(raw: RawExif | undefined): PhotoExif | undefined {
  if (raw === undefined) return undefined;
  const out: PhotoExif = {};

  const camera = cameraName(text(raw.Make), text(raw.Model));
  if (camera !== undefined) out.camera = camera;
  const lens = text(raw.LensModel);
  if (lens !== undefined) out.lens = lens;

  const focal = positive(raw.FocalLength);
  if (focal !== undefined) out.focalLength = `${Math.round(focal)} mm`;
  const fNumber = positive(raw.FNumber);
  if (fNumber !== undefined) out.aperture = `f/${Number(fNumber.toFixed(1))}`;
  const exposure = positive(raw.ExposureTime);
  if (exposure !== undefined) {
    out.shutter =
      exposure >= 1 ? `${Number(exposure.toFixed(1))} s` : `1/${Math.round(1 / exposure)} s`;
  }
  const iso = positive(raw.ISO);
  if (iso !== undefined && Number.isInteger(iso)) out.iso = iso;
  const date = takenOn(raw);
  if (date !== undefined) out.takenOn = date;

  return Object.keys(out).length > 0 ? out : undefined;
}
