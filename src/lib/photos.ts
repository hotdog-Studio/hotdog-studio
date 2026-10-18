import type { Album, Photo, PhotoExif, PhotoSource } from './photos-schema';

/**
 * The `sizes` of a grid thumbnail and of an album cover. The lightbox script writes its own
 * `sizes="100vw"`, so it never imports this module into the client bundle.
 */
export const THUMB_SIZES = '(min-width: 62rem) 25vw, (min-width: 34rem) 50vw, 100vw';
export const COVER_SIZES = '(min-width: 62rem) 33vw, (min-width: 40rem) 50vw, 100vw';

export const albumHref = (slug: string): string => `/photos/${slug}`;
export const photoHref = (slug: string, id: string): string => `${albumHref(slug)}#${id}`;

/** The class that paints a photo's dominant colour behind it while it loads. */
export const placeholderClass = (id: string): string => `ph-${id}`;

const albumDate = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `2025-06-14` as `June 2025`. UTC both ways, so the first of a month never slips into the last. */
export function formatAlbumDate(isoDate: string): string {
  return albumDate.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatPhotoCount(count: number): string {
  return count === 1 ? '1 photo' : `${count} photos`;
}

/** The EXIF line under a lightbox photo. The lens and the date stay in the manifest, unshown. */
export function formatExifLine(exif: PhotoExif | undefined): string | undefined {
  if (exif === undefined) return undefined;
  const parts = [
    exif.camera,
    exif.focalLength,
    exif.aperture,
    exif.shutter,
    exif.iso === undefined ? undefined : `ISO ${exif.iso}`,
  ].filter((part): part is string => part !== undefined);
  return parts.length === 0 ? undefined : parts.join(' · ');
}

export const srcset = (sources: readonly PhotoSource[]): string =>
  sources.map(({ src, w }) => `${src} ${w}w`).join(', ');

/** The widest WebP, which every browser can show full size. The schema guarantees at least one. */
export function largestWebp(photo: Photo): string {
  const widest = photo.sources.webp.reduce((best, source) => (source.w > best.w ? source : best));
  return widest.src;
}

/** The schema guarantees `coverId` names one of the album's photos. */
export function coverPhoto(album: Album): Photo {
  const cover = album.photos.find((photo) => photo.id === album.coverId);
  if (cover === undefined) throw new Error(`Album "${album.slug}" has no photo ${album.coverId}`);
  return cover;
}

export type PhotoGridItem = {
  photo: Photo;
  href: string;
  lightbox?: { caption?: string | undefined; exifLine?: string | undefined } | undefined;
};

/** Grid items for an album page: each links to the full image, which the lightbox opens. */
export function lightboxItems(album: Album): PhotoGridItem[] {
  return album.photos.map((photo) => ({
    photo,
    href: largestWebp(photo),
    lightbox: {
      caption: photo.caption,
      exifLine: album.showExif ? formatExifLine(photo.exif) : undefined,
    },
  }));
}

/** Grid items for the home page: each deep-links to its place in the album, with no lightbox. */
export function latestItems(album: Album, count = 6): PhotoGridItem[] {
  return album.photos
    .slice(0, count)
    .map((photo) => ({ photo, href: photoHref(album.slug, photo.id) }));
}
