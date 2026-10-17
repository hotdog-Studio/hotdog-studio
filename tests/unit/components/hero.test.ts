import { describe, expect, it } from 'vitest';
import Hero from '../../../src/components/Hero.astro';
import type { SiteConfig } from '../../../src/lib/site-config-schema';
import { renderHtml } from '../../support/render';

// The fixture build's site config (fixtures/site.config.ts), inline so each expectation is visible.
const openToWork: SiteConfig = {
  name: 'Thomas Southcott',
  jobTitle: 'Fixture QA Engineer',
  tagline: 'Fixture tagline: I build test automation.',
  pitch: 'Fixture pitch sentence one. Fixture pitch sentence two.',
  email: 'hello@example.com',
  links: {
    github: 'https://github.com/thomassouthcott',
    linkedin: 'https://www.linkedin.com/in/fixture',
    reelRaffle: 'https://reelraffle.org',
  },
  cv: '/cv/thomas-southcott-cv.pdf',
  openToWork: { enabled: true, message: 'Fixture: open to QA automation roles.' },
};
const notOpenToWork: SiteConfig = { ...openToWork, openToWork: { enabled: false, message: '' } };

const linkWithText = (doc: Document, text: string) =>
  [...doc.querySelectorAll('a')].find((link) => link.textContent === text);

describe('Hero', () => {
  it('heads the page with the name, followed by the tagline and then the pitch', async () => {
    const doc = await renderHtml(Hero, { site: openToWork });
    expect([...doc.querySelectorAll('h1')].map((h1) => h1.textContent)).toEqual([
      'Thomas Southcott',
    ]);
    expect([...doc.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      'Fixture tagline: I build test automation.',
      'Fixture pitch sentence one. Fixture pitch sentence two.',
    ]);
  });

  it('offers the CV as a download while open to work', async () => {
    const doc = await renderHtml(Hero, { site: openToWork });
    const cv = linkWithText(doc, 'Download CV');
    expect(cv?.getAttribute('href')).toBe('/cv/thomas-southcott-cv.pdf');
    expect(cv?.hasAttribute('download')).toBe(true);
  });

  it('leaves the CV out when not open to work', async () => {
    const doc = await renderHtml(Hero, { site: notOpenToWork });
    expect(linkWithText(doc, 'Download CV')).toBeUndefined();
  });

  it.each([
    ['open to work', openToWork],
    ['not open to work', notOpenToWork],
  ])('links to the work index and the email address while %s', async (_state, site) => {
    const doc = await renderHtml(Hero, { site });
    expect(linkWithText(doc, 'See my work')?.getAttribute('href')).toBe('/work');
    expect(linkWithText(doc, 'Email me')?.getAttribute('href')).toBe('mailto:hello@example.com');
  });

  // The flex gap spaces the links on screen. These spaces keep them apart when CSS is off.
  it.each([
    ['open to work', openToWork, 'See my work Download CV Email me'],
    ['not open to work', notOpenToWork, 'See my work Email me'],
  ])('keeps its links apart in plain text while %s', async (_state, site, links) => {
    const doc = await renderHtml(Hero, { site });
    expect(doc.body.textContent.replace(/\s+/g, ' ')).toContain(links);
  });
});
