import { describe, expect, it } from 'vitest';
import Lightbox from '../../../src/components/Lightbox.astro';
import { renderHtml } from '../../support/render';

const buttonNames = (doc: Document): (string | null)[] =>
  [...doc.querySelectorAll('button')].map((button) => button.textContent);

describe('Lightbox', () => {
  it('names the dialog and gives it Close, Previous and Next', async () => {
    const doc = await renderHtml(Lightbox, { count: 3 });
    expect(doc.querySelector('dialog')?.getAttribute('aria-label')).toBe('Photo viewer');
    expect(buttonNames(doc)).toEqual(['Close', 'Previous', 'Next']);
    // The script builds the picture, so the page never has an <img> without a src.
    expect(doc.querySelector('img')).toBeNull();
  });

  it('gives a one-photo album only Close, as there is nothing to move to', async () => {
    const doc = await renderHtml(Lightbox, { count: 1 });
    expect(buttonNames(doc)).toEqual(['Close']);
  });

  it.each([1, 3])('has no inline style with %i photos', async (count) => {
    const doc = await renderHtml(Lightbox, { count });
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
  });
});
