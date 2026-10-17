import { describe, expect, it } from 'vitest';
import SiteFooter from '../../../src/components/SiteFooter.astro';
import { renderHtml } from '../../support/render';

const props = {
  links: {
    github: 'https://github.com/example',
    linkedin: 'https://www.linkedin.com/in/example',
    reelRaffle: 'https://reelraffle.example',
  },
  email: 'someone@example.com',
  buildStamp: 'Build #42 · abc1234',
};

const linkWithText = (doc: Document, text: string) =>
  [...doc.querySelectorAll('a')].find((link) => link.textContent === text);

describe('SiteFooter', () => {
  it('shows the build stamp it was given', async () => {
    const doc = await renderHtml(SiteFooter, props);
    expect(doc.querySelector('.build-stamp')?.textContent).toBe('Build #42 · abc1234');
  });

  it('links the Astro and Playwright line to the quality page', async () => {
    const doc = await renderHtml(SiteFooter, props);
    const link = linkWithText(doc, 'Built with Astro, tested with Playwright');
    expect(link?.getAttribute('href')).toBe('/quality');
  });

  it('points the mailto: link at the email it was given', async () => {
    const doc = await renderHtml(SiteFooter, props);
    const mailto = doc.querySelectorAll('a[href^="mailto:"]');
    expect([...mailto].map((link) => link.getAttribute('href'))).toEqual([
      'mailto:someone@example.com',
    ]);
  });

  it('keeps the contact links in a list that Safari still treats as one', async () => {
    const doc = await renderHtml(SiteFooter, props);
    const list = doc.querySelector('footer ul');
    // Safari drops the list role from a list with no bullets, so the role is set explicitly.
    expect(list?.getAttribute('role')).toBe('list');
    expect([...(list?.querySelectorAll('li > a') ?? [])].map((link) => link.textContent)).toEqual([
      'GitHub',
      'LinkedIn',
      'Email',
      'Reel Raffle',
    ]);
  });

  it('labels each contact link and points it at the address it was given', async () => {
    const doc = await renderHtml(SiteFooter, props);
    const labels = ['GitHub', 'LinkedIn', 'Email', 'Reel Raffle'];
    expect(labels.map((label) => linkWithText(doc, label)?.getAttribute('href'))).toEqual([
      'https://github.com/example',
      'https://www.linkedin.com/in/example',
      'mailto:someone@example.com',
      'https://reelraffle.example',
    ]);
  });
});
