import { describe, expect, it } from 'vitest';
import ThumbnailPicture from '../../../src/components/ThumbnailPicture.astro';
import { makePhoto } from '../../support/photo-manifest';
import { renderHtml } from '../../support/render';

const props = (overrides = {}) => ({
  photo: makePhoto(),
  sizes: '100vw',
  loading: 'lazy' as const,
  ...overrides,
});

describe('ThumbnailPicture', () => {
  it('offers AVIF before WebP, each listing every width', async () => {
    const photo = makePhoto();
    const doc = await renderHtml(ThumbnailPicture, props({ photo }));
    const sources = [...doc.querySelectorAll('picture source')];
    expect(sources.map((s) => s.getAttribute('type'))).toEqual(['image/avif', 'image/webp']);
    for (const [index, format] of (['avif', 'webp'] as const).entries()) {
      const srcset = sources[index]?.getAttribute('srcset') ?? '';
      for (const { src, w } of photo.sources[format]) expect(srcset).toContain(`${src} ${w}w`);
      expect(sources[index]?.getAttribute('sizes')).toBe('100vw');
    }
  });

  it('uses the largest WebP as the img src', async () => {
    const photo = makePhoto();
    const doc = await renderHtml(ThumbnailPicture, props({ photo }));
    const widest = photo.sources.webp.reduce((a, b) => (b.w > a.w ? b : a));
    expect(doc.querySelector('img')?.getAttribute('src')).toBe(widest.src);
  });

  it('passes width, height, alt and loading through', async () => {
    const photo = makePhoto();
    const doc = await renderHtml(ThumbnailPicture, props({ photo, loading: 'eager' }));
    const img = doc.querySelector('img');
    expect(img?.getAttribute('width')).toBe(String(photo.width));
    expect(img?.getAttribute('height')).toBe(String(photo.height));
    expect(img?.getAttribute('alt')).toBe(photo.alt);
    expect(img?.getAttribute('loading')).toBe('eager');
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('takes its placeholder colour from a class, never a style attribute', async () => {
    const doc = await renderHtml(ThumbnailPicture, props());
    expect(doc.querySelector('img')?.classList.contains('ph-0123456789')).toBe(true);
    expect(doc.querySelector('[style]')).toBeNull();
  });
});
