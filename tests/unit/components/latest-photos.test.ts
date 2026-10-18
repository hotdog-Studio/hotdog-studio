import { describe, expect, it } from 'vitest';
import LatestPhotos from '../../../src/components/LatestPhotos.astro';
import { makeAlbum, makePhoto } from '../../support/photo-manifest';
import { renderHtml } from '../../support/render';

describe('LatestPhotos', () => {
  it('titles the section and links to the album', async () => {
    const doc = await renderHtml(LatestPhotos, {
      album: makeAlbum({ slug: 'album-newer', title: 'Newer' }),
    });
    expect(doc.querySelector('h2#latest-photos-heading')?.textContent).toBe('Latest photos');
    expect(doc.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      'latest-photos-heading',
    );
    const link = doc.querySelector('p a');
    expect(link?.getAttribute('href')).toBe('/photos/album-newer');
    expect(link?.textContent).toBe('Newer');
    expect(doc.querySelector('p')?.textContent).toBe('From Newer, June 2025.');
  });

  it('shows six photos of an eight-photo album, each deep-linked', async () => {
    const photos = Array.from({ length: 8 }, (_, n) => makePhoto({ id: `${n}123456789` }));
    const doc = await renderHtml(LatestPhotos, {
      album: makeAlbum({ photos, coverId: photos[0]?.id ?? '' }),
    });
    const hrefs = [...doc.querySelectorAll('ul a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toHaveLength(6);
    for (const href of hrefs) expect(href).toMatch(/^\/photos\/test-album#\d123456789$/);
  });
});
