import { z } from 'astro/zod';

/** Text a person has to write. An empty string satisfies `z.string()` but says nothing. */
const text = () => z.string().min(1, { error: 'Must not be empty' });

/**
 * The EXIF fields the site may publish (spec §6.5). Strict, so a field the allowlist should have
 * stopped, such as `gps`, fails here too. This schema is the second guard behind it.
 */
export const photoExifSchema = z.strictObject({
  camera: text().optional(),
  lens: text().optional(),
  focalLength: text().optional(),
  aperture: text().optional(),
  shutter: text().optional(),
  iso: z.int().positive().optional(),
  takenOn: z.iso.date().optional(),
});
export type PhotoExif = z.output<typeof photoExifSchema>;

/** One encoded width of a photo. The path pins the album, the photo id, the width and the format. */
export const photoSourceSchema = z.strictObject({
  w: z.int().positive(),
  src: z.string().regex(/^\/photos\/[a-z0-9-]+\/[0-9a-f]{10}-\d+\.(avif|webp)$/, {
    error: 'Must be a /photos/<album>/<id>-<width>.avif or .webp path',
  }),
});
export type PhotoSource = z.output<typeof photoSourceSchema>;

const sourceList = () => z.array(photoSourceSchema).min(1);

export const photoSchema = z.strictObject({
  id: z.string().regex(/^[0-9a-f]{10}$/, { error: 'Must be 10 lower-case hex digits' }),
  alt: text(),
  altIsFallback: z.boolean(),
  caption: text().optional(),
  width: z.int().positive(),
  height: z.int().positive(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/, { error: 'Must be a #rrggbb colour' }),
  sources: z.strictObject({ avif: sourceList(), webp: sourceList() }),
  exif: photoExifSchema.optional(),
});
export type Photo = z.output<typeof photoSchema>;

export const albumSchema = z
  .strictObject({
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, { error: 'Must be lower-case letters, digits and hyphens' }),
    title: text(),
    date: z.iso.date(),
    description: text().optional(),
    showExif: z.boolean(),
    coverId: z.string(),
    photos: z.array(photoSchema).min(1),
  })
  .superRefine((album, ctx) => {
    if (!album.photos.some((photo) => photo.id === album.coverId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['coverId'],
        message: 'coverId must be the id of one of the album photos',
      });
    }
  });
export type Album = z.output<typeof albumSchema>;

/** The shape of `src/generated/photos.json` (spec §6.5). */
export const photoManifestSchema = z.strictObject({ albums: z.array(albumSchema) });
export type PhotoManifest = z.output<typeof photoManifestSchema>;
