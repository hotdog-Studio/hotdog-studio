import type { Album, Photo } from '../../src/lib/photos-schema';

/** A valid photo. Each override replaces a whole field, so a test states only what it cares about. */
export function makePhoto(overrides: Partial<Photo> = {}): Photo {
  const id = overrides.id ?? '0123456789';
  return {
    id,
    alt: 'A test photo',
    altIsFallback: false,
    width: 1600,
    height: 1067,
    dominantColor: '#c89818',
    sources: {
      avif: [480, 960].map((w) => ({ w, src: `/photos/test-album/${id}-${w}.avif` })),
      webp: [480, 960].map((w) => ({ w, src: `/photos/test-album/${id}-${w}.webp` })),
    },
    ...overrides,
  };
}

/** A valid album of three photos with distinct ids. The cover is the first. */
export function makeAlbum(overrides: Partial<Album> = {}): Album {
  const photos = ['0123456789', '1123456789', '2123456789'].map((id) => makePhoto({ id }));
  return {
    slug: 'test-album',
    title: 'Test album',
    date: '2025-06-14',
    showExif: true,
    coverId: photos[0]?.id ?? '',
    photos,
    ...overrides,
  };
}
