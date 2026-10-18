import sharp from 'sharp';

// This file is the ONLY place allowed to call sharp's withMetadata and withExif.
// The photo pipeline in scripts/photos/ must never write metadata, and a unit test
// scans its source for these calls. Fixtures need them so that the originals carry
// privacy bait (fake GPS, serial, artist) for the checks to find.

export type FixtureImageOptions = {
  /** The upright size, before any Orientation rotation is stored. */
  width: number;
  height: number;
  label: string;
  format?: 'jpeg' | 'png' | 'tiff' | 'webp' | undefined;
  /** Store the pixels rotated -90 and tag Orientation 6, as a phone held upright does. */
  orientation?: 6 | undefined;
  /** EXIF is written for JPEG only; `false` leaves even a JPEG without any. */
  exif?: { takenAt?: string | undefined } | false | undefined;
};

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = ({ width, height, label }: FixtureImageOptions): Buffer =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#f2c230"/><stop offset="1" stop-color="#8a6500"/>` +
      `</linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<text x="50%" y="50%" font-size="${Math.max(16, Math.round(Math.min(width, height) / 12))}" ` +
      `font-family="sans-serif" fill="#ffffff" text-anchor="middle">${escapeXml(label)}</text>` +
      `</svg>`,
  );

export async function makeFixtureImage(options: FixtureImageOptions): Promise<Buffer> {
  const { format = 'jpeg', orientation, exif } = options;
  let pipeline = sharp(svg(options));

  if (orientation === 6) {
    // Render upright, then store sideways; a correct pipeline's .rotate() undoes it.
    pipeline = pipeline.rotate(-90).withMetadata({ orientation: 6 });
  }

  if (format === 'jpeg' && exif !== false) {
    const takenAt = exif?.takenAt;
    pipeline = pipeline.withExif({
      IFD0: { Make: 'FixtureCam', Model: 'FixtureCam X1', Artist: 'Fixture Artist' },
      IFD2: {
        ExposureTime: '1/250',
        FNumber: '18/10',
        FocalLength: '35/1',
        ISOSpeedRatings: '100',
        LensModel: 'Fixture 35mm F1.8',
        BodySerialNumber: 'FIXTURE-SERIAL',
        ...(takenAt === undefined ? {} : { DateTimeOriginal: takenAt }),
      },
      // 0N 0E: a fake position that is easy to recognise if it ever leaks.
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '0/1 0/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '0/1 0/1 0/1',
      },
    });
  }

  switch (format) {
    case 'png':
      return pipeline.png().toBuffer();
    case 'tiff':
      return pipeline.tiff().toBuffer();
    case 'webp':
      return pipeline.webp().toBuffer();
    default:
      return pipeline.jpeg({ quality: 80 }).toBuffer();
  }
}
