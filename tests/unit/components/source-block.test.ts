import { describe, expect, it } from 'vitest';
import SourceBlock from '../../../src/components/SourceBlock.astro';
import { renderHtml } from '../../support/render';

// Not the fixtures' values, so a component that hard-codes them can't pass.
const repo = 'https://github.com/example/tide-tracker';
const privateNote = 'Client names and hostnames were replaced before publishing.';
const testsBadge = {
  label: 'tests',
  src: 'https://img.shields.io/badge/tests-passing-brightgreen',
  href: 'https://github.com/example/tide-tracker/actions',
};
const coverageBadge = {
  label: 'coverage',
  src: 'https://img.shields.io/badge/coverage-92%25-green',
  href: 'https://example.com/tide-tracker/coverage',
};

/** The rendered block: the section labelled Source, or null when there is none. */
async function renderSource(props: Record<string, unknown>): Promise<Element | null> {
  const doc = await renderHtml(SourceBlock, props);
  return doc.querySelector('section[aria-label="Source"]');
}

const linkWithText = (root: Element | null, text: string) =>
  [...(root?.querySelectorAll('a') ?? [])].find((link) => link.textContent === text);

/** Each badge as [alt, src, height, the href of the link round it]. */
const badgesIn = (root: Element | null) =>
  [...(root?.querySelectorAll('img') ?? [])].map((img) => [
    img.getAttribute('alt'),
    img.getAttribute('src'),
    img.getAttribute('height'),
    img.closest('a')?.getAttribute('href'),
  ]);

describe('SourceBlock', () => {
  it('links a public study to its repository and shows its badge, with no callout', async () => {
    const source = await renderSource({ source: 'public', repo, badges: [testsBadge] });
    expect(linkWithText(source, 'View the repository')?.getAttribute('href')).toBe(repo);
    expect(source?.querySelector('img')?.getAttribute('alt')).toBe('tests');
    expect(source?.querySelector('.callout')).toBeNull();
  });

  it('shows each badge as an image linked to its own page, in the order given', async () => {
    const source = await renderSource({
      source: 'public',
      repo,
      badges: [testsBadge, coverageBadge],
    });
    expect(badgesIn(source)).toEqual([
      ['tests', testsBadge.src, '20', testsBadge.href],
      ['coverage', coverageBadge.src, '20', coverageBadge.href],
    ]);
  });

  it('shows no badges when a study has none', async () => {
    const source = await renderSource({ source: 'public', repo });
    expect(source?.querySelectorAll('img')).toHaveLength(0);
    expect([...(source?.querySelectorAll('a') ?? [])].map((link) => link.textContent)).toEqual([
      'View the repository',
    ]);
  });

  it('explains a sanitized study is a public edition, with its note and repository link', async () => {
    const source = await renderSource({ source: 'sanitized', repo, privateNote });
    expect(source?.querySelector('.callout')?.textContent).toBe(
      'Public edition of a private framework',
    );
    expect(source?.querySelector('.callout strong')?.textContent).toBe(
      'Public edition of a private framework',
    );
    expect(source?.textContent).toContain(privateNote);
    expect(linkWithText(source, 'View the repository')?.getAttribute('href')).toBe(repo);
  });

  it('shows the badges of a sanitized study too', async () => {
    const source = await renderSource({
      source: 'sanitized',
      repo,
      privateNote,
      badges: [testsBadge],
    });
    expect(badgesIn(source)).toEqual([['tests', testsBadge.src, '20', testsBadge.href]]);
  });

  it('says the source of a private study is private, and nothing else', async () => {
    const source = await renderSource({ source: 'private' });
    expect(source?.querySelector('.callout')?.textContent).toBe(
      'Source is private. Happy to walk through it in interview.',
    );
    expect(source?.textContent.trim()).toBe(
      'Source is private. Happy to walk through it in interview.',
    );
  });

  it('links nothing at all for a private study, even when given a repo and badges', async () => {
    const doc = await renderHtml(SourceBlock, { source: 'private', repo, badges: [testsBadge] });
    expect(doc.querySelector('section[aria-label="Source"]')).not.toBeNull();
    expect(doc.querySelectorAll('a').length).toBe(0);
    expect(doc.querySelectorAll('img').length).toBe(0);
  });
});
