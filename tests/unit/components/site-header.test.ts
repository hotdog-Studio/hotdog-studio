import { describe, expect, it } from 'vitest';
import SiteHeader from '../../../src/components/SiteHeader.astro';
import { renderHtml } from '../../support/render';

const renderHeader = (pathname: string) =>
  renderHtml(SiteHeader, { name: 'Thomas Southcott', pathname });

describe('SiteHeader', () => {
  it('marks only the Work link as the current page inside a case study', async () => {
    const doc = await renderHeader('/work/fixture-public');
    const current = [...doc.querySelectorAll('[aria-current="page"]')];
    expect(current.map((element) => [element.localName, element.textContent])).toEqual([
      ['a', 'Work'],
    ]);
  });

  it('marks nothing as current on the home page', async () => {
    const doc = await renderHeader('/');
    expect(doc.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('puts the skip link first, pointing at the main content', async () => {
    const doc = await renderHeader('/');
    const firstLink = doc.querySelector('a');
    expect(firstLink?.textContent).toBe('Skip to content');
    expect(firstLink?.getAttribute('href')).toBe('#main');
  });

  it('lists Work, Photos and About in the Main navigation', async () => {
    const doc = await renderHeader('/');
    const links = [...doc.querySelectorAll('nav[aria-label="Main"] a')];
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Work', '/work'],
      ['Photos', '/photos'],
      ['About', '/about'],
    ]);
  });

  it('links the name it was given home, keeping the hidden wordmark out of the link', async () => {
    const doc = await renderHtml(SiteHeader, { name: 'Alex Example', pathname: '/' });
    expect(doc.querySelector('a[href="/"]')?.textContent).toBe('Alex Example');
    expect(doc.querySelector('[aria-hidden="true"]')?.textContent).toBe('hotdog.studio');
  });
});
