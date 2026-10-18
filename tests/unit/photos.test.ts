import { describe, expect, it } from 'vitest';
import {
  albumHref,
  coverPhoto,
  formatAlbumDate,
  formatExifLine,
  formatPhotoCount,
  largestWebp,
  latestItems,
  lightboxItems,
  photoHref,
  placeholderClass,
  srcset,
} from '../../src/lib/photos';
import { makeAlbum, makePhoto } from '../support/photo-manifest';

describe('hrefs', () => {
  it('links an album and a photo within it', () => {
    expect(albumHref('summer')).toBe('/photos/summer');
    expect(photoHref('summer', '0123456789')).toBe('/photos/summer#0123456789');
  });
  it('names the placeholder class after the photo id', () => {
    expect(placeholderClass('0123456789')).toBe('ph-0123456789');
  });
});

describe('formatAlbumDate', () => {
  it.each([
    ['2025-06-14', 'June 2025'],
    ['2024-09-01', 'September 2024'],
    // The first of the month would fall into December if the date were read in local time.
    ['2025-01-01', 'January 2025'],
  ])('formats %s as %s', (iso, expected) => {
    expect(formatAlbumDate(iso)).toBe(expected);
  });
});

describe('formatPhotoCount', () => {
  it('pluralises', () => {
    expect(formatPhotoCount(1)).toBe('1 photo');
    expect(formatPhotoCount(3)).toBe('3 photos');
  });
});

describe('formatExifLine', () => {
  it('joins the shown fields and leaves out the lens and the date', () => {
    expect(
      formatExifLine({
        camera: 'Sony A7 III',
        lens: 'FE 35mm F1.8',
        focalLength: '35 mm',
        aperture: 'f/1.8',
        shutter: '1/250 s',
        iso: 100,
        takenOn: '2025-06-14',
      }),
    ).toBe('Sony A7 III · 35 mm · f/1.8 · 1/250 s · ISO 100');
  });
  it('skips absent fields', () => {
    expect(formatExifLine({ aperture: 'f/2' })).toBe('f/2');
  });
  it('is undefined when nothing is shown', () => {
    expect(formatExifLine({})).toBeUndefined();
    expect(formatExifLine(undefined)).toBeUndefined();
    expect(formatExifLine({ lens: 'FE 35mm', takenOn: '2025-06-14' })).toBeUndefined();
  });
});

describe('srcset and largestWebp', () => {
  it('writes a srcset', () => {
    expect(
      srcset([
        { w: 480, src: '/photos/a/0123456789-480.webp' },
        { w: 960, src: '/photos/a/0123456789-960.webp' },
      ]),
    ).toBe('/photos/a/0123456789-480.webp 480w, /photos/a/0123456789-960.webp 960w');
  });
  it('picks the widest WebP even when the list is unsorted', () => {
    const photo = makePhoto({
      sources: {
        avif: [{ w: 480, src: '/photos/a/0123456789-480.avif' }],
        webp: [
          { w: 960, src: '/photos/a/0123456789-960.webp' },
          { w: 1920, src: '/photos/a/0123456789-1920.webp' },
          { w: 480, src: '/photos/a/0123456789-480.webp' },
        ],
      },
    });
    expect(largestWebp(photo)).toBe('/photos/a/0123456789-1920.webp');
  });
});

describe('coverPhoto', () => {
  it('returns the photo named by coverId, even when it is not first', () => {
    const album = makeAlbum();
    const second = album.photos[1];
    expect(coverPhoto({ ...album, coverId: second?.id ?? '' })).toBe(second);
  });
});

describe('lightboxItems', () => {
  it('links each photo to its largest WebP and passes the caption through', () => {
    const photo = makePhoto({ caption: 'Low tide' });
    const [item] = lightboxItems(makeAlbum({ photos: [photo], coverId: photo.id }));
    expect(item?.href).toBe(largestWebp(photo));
    expect(item?.lightbox?.caption).toBe('Low tide');
  });
  it('includes the EXIF line only when the album shows EXIF', () => {
    const photo = makePhoto({ exif: { camera: 'Sony A7 III', iso: 100 } });
    const base = { photos: [photo], coverId: photo.id };
    expect(lightboxItems(makeAlbum({ ...base, showExif: true }))[0]?.lightbox?.exifLine).toBe(
      'Sony A7 III · ISO 100',
    );
    expect(
      lightboxItems(makeAlbum({ ...base, showExif: false }))[0]?.lightbox?.exifLine,
    ).toBeUndefined();
  });
});

describe('latestItems', () => {
  it('takes the first six photos in order, linking to their place in the album', () => {
    const photos = Array.from({ length: 8 }, (_, n) => makePhoto({ id: `${n}123456789` }));
    const album = makeAlbum({ slug: 'summer', photos, coverId: '0123456789' });
    const items = latestItems(album);
    expect(items.map((item) => item.photo.id)).toEqual(photos.slice(0, 6).map((p) => p.id));
    for (const item of items) {
      expect(item.href).toBe(`/photos/summer#${item.photo.id}`);
      expect(item.lightbox).toBeUndefined();
    }
  });
});
