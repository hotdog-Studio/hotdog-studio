import { describe, expect, it } from 'vitest';
import CaseStudyHeader from '../../../src/components/CaseStudyHeader.astro';
import { renderHtml } from '../../support/render';

// Not a fixture study, so a header that hard-codes the fixtures can't pass.
const study = {
  title: 'Tide Tracker',
  summary: 'A command-line tide table, tested end to end against a recorded API.',
  stack: ['Playwright', 'Spring Boot'],
  source: 'sanitized',
};
const repo = 'https://github.com/example/tide-tracker';
const liveUrl = 'https://tides.example';

const renderHeader = (props: Record<string, unknown> = {}) =>
  renderHtml(CaseStudyHeader, { ...study, ...props });

/** Every link, as [text, href]. */
const linksIn = (doc: Document) =>
  [...doc.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')]);

/** Every term with the description that follows it, as [term, description]. */
const termsIn = (doc: Document) =>
  [...doc.querySelectorAll('dt')].map((term) => [
    term.textContent,
    term.nextElementSibling?.localName === 'dd' ? term.nextElementSibling.textContent : null,
  ]);

describe('CaseStudyHeader', () => {
  it('heads the page with the title, followed by the summary', async () => {
    const doc = await renderHeader();
    expect([...doc.querySelectorAll('h1')].map((h1) => h1.textContent)).toEqual(['Tide Tracker']);
    expect(doc.querySelector('h1 + p')?.textContent).toBe(
      'A command-line tide table, tested end to end against a recorded API.',
    );
  });

  it('lists the stack and badges the source', async () => {
    const doc = await renderHeader();
    const stack = doc.querySelectorAll('ul[aria-label="Stack"] li');
    expect([...stack].map((item) => item.textContent)).toEqual(['Playwright', 'Spring Boot']);
    expect(doc.querySelector('.source-badge')?.textContent).toBe('Public edition');
  });

  it.each([
    ['neither', {}, []],
    ['a repo', { repo }, [['Repository', repo]]],
    ['a live site', { liveUrl }, [['Live site', liveUrl]]],
    [
      'both',
      { repo, liveUrl },
      [
        ['Repository', repo],
        ['Live site', liveUrl],
      ],
    ],
  ])('links Repository and Live site only when given them: %s', async (_case, props, links) => {
    const doc = await renderHeader(props);
    expect(linksIn(doc)).toEqual(links);
  });

  it.each([
    ['a role', { role: 'Test lead' }, [['Role', 'Test lead']]],
    ['a period', { period: '2021–2023' }, [['Period', '2021–2023']]],
    [
      'both',
      { role: 'Test lead', period: '2021–2023' },
      [
        ['Role', 'Test lead'],
        ['Period', '2021–2023'],
      ],
    ],
  ])('gives the Role and Period terms only when given them: %s', async (_case, props, terms) => {
    const doc = await renderHeader(props);
    expect(termsIn(doc)).toEqual(terms);
  });

  it('leaves the definition list out when there is neither a role nor a period', async () => {
    const doc = await renderHeader();
    expect(doc.querySelector('dl')).toBeNull();
    expect(doc.querySelectorAll('dt, dd')).toHaveLength(0);
  });

  // The flex gap spaces the links on screen. The space keeps them apart when CSS is off.
  it('keeps its links apart in plain text', async () => {
    const doc = await renderHeader({ repo, liveUrl });
    expect(doc.body.textContent).toContain('Repository Live site');
  });
});
