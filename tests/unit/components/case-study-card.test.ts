import { describe, expect, it } from 'vitest';
import CaseStudyCard from '../../../src/components/CaseStudyCard.astro';
import { renderHtml } from '../../support/render';

const study = {
  href: '/work/example-study',
  title: 'Example study',
  summary: 'An example study, so the card can only show what it was given.',
  stack: ['Spring Boot', 'Cucumber'],
  source: 'public',
};

describe('CaseStudyCard', () => {
  it.each([
    ['public', 'Public'],
    ['sanitized', 'Public edition'],
    ['private', 'Private'],
  ])('badges a %s study as %s', async (source, label) => {
    const doc = await renderHtml(CaseStudyCard, { ...study, source });
    expect(doc.querySelector('article .source-badge')?.textContent).toBe(label);
  });

  it('links its heading, an h3 by default, to the case study', async () => {
    const doc = await renderHtml(CaseStudyCard, study);
    const link = doc.querySelector('article h3 a');
    expect(link?.textContent).toBe('Example study');
    expect(link?.getAttribute('href')).toBe('/work/example-study');
  });

  it('renders the heading as an h2 when headingLevel is 2', async () => {
    const doc = await renderHtml(CaseStudyCard, { ...study, headingLevel: 2 });
    expect(doc.querySelector('article h2 a')?.getAttribute('href')).toBe('/work/example-study');
    expect(doc.querySelector('h3')).toBeNull();
  });

  it('shows the summary and lists the stack', async () => {
    const doc = await renderHtml(CaseStudyCard, study);
    expect(doc.querySelector('article')?.textContent).toContain(
      'An example study, so the card can only show what it was given.',
    );
    const stack = doc.querySelectorAll('article ul[aria-label="Stack"] li');
    expect([...stack].map((item) => item.textContent)).toEqual(['Spring Boot', 'Cucumber']);
  });
});
