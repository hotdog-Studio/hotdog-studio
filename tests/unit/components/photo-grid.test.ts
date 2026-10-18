import { describe, expect, it } from 'vitest';
import PhotoGrid from '../../../src/components/PhotoGrid.astro';
import { latestItems, lightboxItems, srcset } from '../../../src/lib/photos';
import { makeAlbum } from '../../support/photo-manifest';
import { renderHtml } from '../../support/render';

describe('PhotoGrid', () => {
  it('gives each lightbox link the data the lightbox reads', async () => {
    const album = makeAlbum();
    const doc = await renderHtml(PhotoGrid, { items: lightboxItems(album), label: 'Photos' });
    const links = [...doc.querySelectorAll('ul[aria-label="Photos"] > li > a')];
    expect(links).toHaveLength(3);
    album.photos.forEach((photo, n) => {
      const link = links[n];
      expect(link?.getAttribute('id')).toBe(photo.id);
      expect(link?.hasAttribute('data-lightbox-item')).toBe(true);
      expect(link?.getAttribute('data-avif')).toBe(srcset(photo.sources.avif));
      expect(link?.getAttribute('data-webp')).toBe(srcset(photo.sources.webp));
      expect(link?.getAttribute('data-width')).toBe(String(photo.width));
      expect(link?.getAttribute('data-height')).toBe(String(photo.height));
      expect(link?.getAttribute('href')).toBe(`/photos/test-album/${photo.id}-960.webp`);
    });
  });

  it('adds data-caption and data-exif only when they have a value', async () => {
    const [first, second] = makeAlbum().photos;
    if (first === undefined || second === undefined) throw new Error('fixture');
    const doc = await renderHtml(PhotoGrid, {
      items: [
        { photo: first, href: '/a', lightbox: { caption: 'Hello.', exifLine: 'Sony · ISO 100' } },
        { photo: second, href: '/b', lightbox: { caption: undefined, exifLine: undefined } },
      ],
    });
    const [a, b] = [...doc.querySelectorAll('a')];
    expect(a?.getAttribute('data-caption')).toBe('Hello.');
    expect(a?.getAttribute('data-exif')).toBe('Sony · ISO 100');
    expect(b?.hasAttribute('data-caption')).toBe(false);
    expect(b?.hasAttribute('data-exif')).toBe(false);
  });

  it('loads the first `eager` thumbnails eagerly and the rest lazily', async () => {
    const doc = await renderHtml(PhotoGrid, { items: lightboxItems(makeAlbum()), eager: 1 });
    const loading = [...doc.querySelectorAll('img')].map((img) => img.getAttribute('loading'));
    expect(loading).toEqual(['eager', 'lazy', 'lazy']);
  });

  it('has no inline style', async () => {
    const doc = await renderHtml(PhotoGrid, { items: lightboxItems(makeAlbum()) });
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
  });

  it('gives the latest-photos items no id and no data attributes', async () => {
    const album = makeAlbum();
    const doc = await renderHtml(PhotoGrid, { items: latestItems(album) });
    const link = doc.querySelector('a');
    expect(link?.getAttribute('href')).toBe(`/photos/test-album#${album.photos[0]?.id}`);
    expect(link?.hasAttribute('id')).toBe(false);
    expect(
      link
        ?.getAttributeNames()
        .filter((name) => name.startsWith('data-') && !name.startsWith('data-astro-')),
    ).toEqual([]);
  });
});
