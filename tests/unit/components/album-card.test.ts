import { describe, expect, it } from 'vitest';
import AlbumCard from '../../../src/components/AlbumCard.astro';
import { makeAlbum, makePhoto } from '../../support/photo-manifest';
import { renderHtml } from '../../support/render';

describe('AlbumCard', () => {
  it('links its heading to the album', async () => {
    const doc = await renderHtml(AlbumCard, {
      album: makeAlbum({ slug: 'album-newer', title: 'Newer' }),
      loading: 'lazy',
    });
    const link = doc.querySelector('article h2 a');
    expect(link?.textContent).toBe('Newer');
    expect(link?.getAttribute('href')).toBe('/photos/album-newer');
  });

  it('shows the month and the photo count', async () => {
    const doc = await renderHtml(AlbumCard, {
      album: makeAlbum({ date: '2025-06-14' }),
      loading: 'lazy',
    });
    expect(doc.querySelector('time[datetime="2025-06-14"]')?.textContent).toBe('June 2025');
    expect(doc.querySelector('.meta')?.textContent).toBe('June 2025 · 3 photos');
  });

  it('says "1 photo" for a one-photo album', async () => {
    const photo = makePhoto();
    const doc = await renderHtml(AlbumCard, {
      album: makeAlbum({ photos: [photo], coverId: photo.id }),
      loading: 'lazy',
    });
    expect(doc.querySelector('.meta')?.textContent).toContain('· 1 photo');
    expect(doc.querySelector('.meta')?.textContent).not.toContain('photos');
  });

  it('shows the cover photo, which need not be the first', async () => {
    const photos = ['0123456789', '1123456789', '2123456789'].map((id, n) =>
      makePhoto({ id, alt: `Photo ${n + 1}` }),
    );
    const cover = makePhoto({ id: '2123456789', alt: 'Photo 3' });
    const doc = await renderHtml(AlbumCard, {
      album: makeAlbum({ photos, coverId: cover.id }),
      loading: 'eager',
    });
    expect(doc.querySelector('img')?.getAttribute('alt')).toBe(cover.alt);
    expect(doc.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });
});
