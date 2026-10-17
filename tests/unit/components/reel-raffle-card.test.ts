import { describe, expect, it } from 'vitest';
import ReelRaffleCard from '../../../src/components/ReelRaffleCard.astro';
import { renderHtml } from '../../support/render';

const url = 'https://reelraffle.org';

const linkWithText = (doc: Document, text: string) =>
  [...doc.querySelectorAll('a')].find((link) => link.textContent === text);

describe('ReelRaffleCard', () => {
  it('introduces Reel Raffle in a section labelled by its Built and shipped heading', async () => {
    const doc = await renderHtml(ReelRaffleCard, { url });
    const section = doc.querySelector('section');
    const heading = section?.querySelector('h2');
    expect(heading?.textContent).toBe('Built and shipped');
    expect(heading?.id).not.toBe('');
    expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(section?.querySelector('h3')?.textContent).toBe('Reel Raffle');
    expect(section?.textContent).toContain('A group movie-night picker that uses the TMDB API.');
  });

  it.each([
    ['without', undefined],
    ['with', '/work/reel-raffle'],
  ])('always links to the product, %s a case study', async (_state, caseStudyHref) => {
    const doc = await renderHtml(ReelRaffleCard, { url, caseStudyHref });
    expect(linkWithText(doc, 'Visit reelraffle.org')?.getAttribute('href')).toBe(
      'https://reelraffle.org',
    );
  });

  it('takes the product link from the url it was given', async () => {
    const doc = await renderHtml(ReelRaffleCard, { url: 'https://reelraffle.example/' });
    expect(linkWithText(doc, 'Visit reelraffle.org')?.getAttribute('href')).toBe(
      'https://reelraffle.example/',
    );
  });

  it('links to the case study when there is one', async () => {
    const doc = await renderHtml(ReelRaffleCard, { url, caseStudyHref: '/work/reel-raffle' });
    expect(linkWithText(doc, 'Read the case study')?.getAttribute('href')).toBe(
      '/work/reel-raffle',
    );
  });

  it('leaves the case-study link out when there is none', async () => {
    const doc = await renderHtml(ReelRaffleCard, { url });
    expect(linkWithText(doc, 'Read the case study')).toBeUndefined();
  });

  // The flex gap spaces the links on screen. The space keeps them apart when CSS is off.
  it('keeps its links apart in plain text', async () => {
    const doc = await renderHtml(ReelRaffleCard, { url, caseStudyHref: '/work/reel-raffle' });
    expect(doc.body.textContent).toContain('Visit reelraffle.org Read the case study');
  });
});
