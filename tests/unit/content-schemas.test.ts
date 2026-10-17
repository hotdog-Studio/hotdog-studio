import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import {
  aboutSchema,
  caseStudySchema,
  otherProjectSchema,
  SOURCES,
} from '../../src/lib/content-schemas';

const schema = caseStudySchema(z.string());
const REPO = 'https://github.com/thomassouthcott/import-photos';
const base = { title: 'T', summary: 'S', stack: ['Playwright'] };
const issuePaths = (input: object) =>
  schema.safeParse({ ...base, ...input }).error?.issues.map((i) => i.path.join('.')) ?? [];

describe('SOURCES', () => {
  it('lists the three source kinds', () => {
    expect(SOURCES).toEqual(['public', 'sanitized', 'private']);
  });
});

describe('caseStudySchema: source, repo and privateNote', () => {
  it.each([
    ['public', REPO, undefined, true],
    ['public', undefined, undefined, false],
    ['public', REPO, 'note', false],
    ['public', undefined, 'note', false],
    ['sanitized', REPO, 'note', true],
    ['sanitized', undefined, 'note', false],
    ['sanitized', REPO, undefined, false],
    ['sanitized', undefined, undefined, false],
    ['private', undefined, undefined, true],
    ['private', REPO, undefined, false],
    ['private', undefined, 'note', false],
    ['private', REPO, 'note', false],
  ])('%s with repo=%s and privateNote=%s is valid: %s', (source, repo, privateNote, valid) => {
    expect(schema.safeParse({ ...base, source, repo, privateNote }).success).toBe(valid);
  });
  it('names the repo field when a private study has one', () => {
    expect(issuePaths({ source: 'private', repo: REPO })).toEqual(['repo']);
  });
  it.each([
    ['public', undefined, undefined, 'repo'],
    ['sanitized', undefined, 'note', 'repo'],
    ['sanitized', REPO, undefined, 'privateNote'],
    ['public', REPO, 'note', 'privateNote'],
    ['private', undefined, 'note', 'privateNote'],
  ])(
    '%s with repo=%s and privateNote=%s names the %s field',
    (source, repo, privateNote, field) => {
      expect(issuePaths({ source, repo, privateNote })).toEqual([field]);
    },
  );
  it('names the privateNote field when a sanitized study has an empty one', () => {
    expect(issuePaths({ source: 'sanitized', repo: REPO, privateNote: '' })).toEqual([
      'privateNote',
    ]);
  });
  it('rejects a source outside the three kinds', () => {
    expect(issuePaths({ source: 'secret' })).toEqual(['source']);
  });
  it.each([
    'javascript:alert(1)',
    'mailto:me@example.com',
    'github.com/thomassouthcott/import-photos',
  ])('rejects the non-web repo %s', (repo) =>
    expect(issuePaths({ source: 'public', repo })).toEqual(['repo']),
  );
  it('rejects a non-web liveUrl', () => {
    expect(issuePaths({ source: 'private', liveUrl: 'javascript:alert(1)' })).toEqual(['liveUrl']);
  });
});

describe('caseStudySchema: other fields', () => {
  it('accepts a 160-character summary and rejects 161', () => {
    expect(issuePaths({ source: 'private', summary: 'x'.repeat(160) })).toEqual([]);
    expect(issuePaths({ source: 'private', summary: 'x'.repeat(161) })).toEqual(['summary']);
  });
  it('requires featuredOrder when featured', () => {
    expect(issuePaths({ source: 'private', featured: true })).toEqual(['featuredOrder']);
  });
  it('requires at least one stack entry', () => {
    expect(issuePaths({ source: 'private', stack: [] })).toEqual(['stack']);
  });
  it('defaults featured and draft to false', () => {
    expect(schema.parse({ ...base, source: 'private' })).toMatchObject({
      featured: false,
      draft: false,
    });
  });
  it('requires a title and a summary', () => {
    const result = schema.safeParse({ source: 'private', stack: ['Playwright'] });
    expect(result.error?.issues.map((i) => i.path.join('.')).sort()).toEqual(['summary', 'title']);
  });
  it.each(['featuredOrder', 'order'])('rejects a non-integer %s', (field) => {
    expect(issuePaths({ source: 'private', [field]: 1.5 })).toEqual([field]);
  });
  it.each(['title', 'summary', 'role', 'period'])('rejects an empty %s', (field) => {
    expect(issuePaths({ source: 'private', [field]: '' })).toEqual([field]);
  });
  it('rejects an empty stack entry', () => {
    expect(issuePaths({ source: 'private', stack: [''] })).toEqual(['stack.0']);
  });
  it('validates the cover with the schema it is given', () => {
    expect(issuePaths({ source: 'private', cover: 'cover.jpg' })).toEqual([]);
    expect(issuePaths({ source: 'private', cover: 42 })).toEqual(['cover']);
  });
  it('keeps every optional field it accepts', () => {
    const full = {
      ...base,
      source: 'sanitized',
      repo: REPO,
      privateNote: 'Names and endpoints were replaced.',
      liveUrl: 'https://example.com',
      role: 'QA engineer',
      period: '2021–2023',
      featured: true,
      featuredOrder: 1,
      order: 4,
      badges: [
        { label: 'tests', src: 'https://img.shields.io/badge/tests-passing-green', href: REPO },
      ],
      cover: 'cover.jpg',
      draft: false,
    };
    expect(schema.parse(full)).toEqual(full);
  });
});

describe('caseStudySchema: badges', () => {
  const badge = (src: string) => ({
    source: 'public',
    repo: REPO,
    badges: [{ label: 'tests', src, href: REPO }],
  });
  it.each([
    'https://img.shields.io/badge/tests-passing-green',
    'https://github.com/o/r/actions/workflows/ci.yml/badge.svg',
  ])('accepts %s', (src) => expect(issuePaths(badge(src))).toEqual([]));
  it.each([
    'https://img.shields.io.evil.example/badge.svg',
    'http://img.shields.io/badge/x',
    'https://raw.githubusercontent.com/o/r/main/badge.svg',
  ])('rejects %s', (src) => expect(issuePaths(badge(src))).toEqual(['badges.0.src']));
  it('rejects badges on a private study', () => {
    expect(
      issuePaths({
        source: 'private',
        badges: [{ label: 'x', src: 'https://img.shields.io/x', href: REPO }],
      }),
    ).toEqual(['badges']);
  });
  it('rejects even an empty badges list on a private study', () => {
    expect(issuePaths({ source: 'private', badges: [] })).toEqual(['badges']);
  });
  it('accepts badges on a sanitized study', () => {
    expect(
      issuePaths({
        source: 'sanitized',
        repo: REPO,
        privateNote: 'note',
        badges: [{ label: 'x', src: 'https://img.shields.io/x', href: REPO }],
      }),
    ).toEqual([]);
  });
  it.each([
    'https://img.shields.io@evil.example/badge.svg',
    'https://evil.example/img.shields.io/badge.svg',
    'https://evilgithub.com/badge.svg',
  ])('rejects the lookalike host in %s', (src) =>
    expect(issuePaths(badge(src))).toEqual(['badges.0.src']),
  );
  it.each(['not a url', 'https://', '', 'javascript:alert(1)', 'mailto:me@example.com'])(
    'reports the malformed or non-web badge src %j once, without throwing',
    (src) => {
      expect(() => issuePaths(badge(src))).not.toThrow();
      expect(issuePaths(badge(src))).toEqual(['badges.0.src']);
    },
  );
  it('reports a malformed badge src once when parsed asynchronously, as Astro does', async () => {
    const result = await schema.safeParseAsync({ ...base, ...badge('not a url') });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['badges.0.src']);
  });
  it('still reports the study-level rules next to a malformed badge src', () => {
    const malformed = { label: 'tests', src: 'not a url', href: REPO };
    expect(issuePaths({ source: 'public', badges: [malformed] }).sort()).toEqual([
      'badges.0.src',
      'repo',
    ]);
  });
  it('names the badge that is wrong', () => {
    const good = { label: 'tests', src: 'https://img.shields.io/x', href: REPO };
    const bad = { label: 'tests', src: 'https://evil.example/x.svg', href: REPO };
    expect(issuePaths({ source: 'public', repo: REPO, badges: [good, bad] })).toEqual([
      'badges.1.src',
    ]);
  });
  it('rejects an empty badge label', () => {
    const badges = [{ label: '', src: 'https://img.shields.io/x', href: REPO }];
    expect(issuePaths({ source: 'public', repo: REPO, badges })).toEqual(['badges.0.label']);
  });
  it('rejects a non-web badge href', () => {
    const src = 'https://img.shields.io/x';
    expect(
      issuePaths({
        source: 'public',
        repo: REPO,
        badges: [{ label: 'tests', src, href: 'javascript:alert(1)' }],
      }),
    ).toEqual(['badges.0.href']);
  });
});

describe('otherProjectSchema', () => {
  it('requires a URL repo', () => {
    expect(
      otherProjectSchema.safeParse({ name: 'N', description: 'D', repo: 'nope' }).success,
    ).toBe(false);
  });
  it('rejects a non-web repo', () => {
    const result = otherProjectSchema.safeParse({
      name: 'N',
      description: 'D',
      repo: 'javascript:alert(1)',
    });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['repo']);
  });
  it.each(['name', 'description'])('rejects an empty %s', (field) => {
    const result = otherProjectSchema.safeParse({
      name: 'N',
      description: 'D',
      repo: REPO,
      [field]: '',
    });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual([field]);
  });
  it('drops the positional id that the file() loader adds', () => {
    const project = { name: 'N', description: 'D', repo: REPO };
    expect(otherProjectSchema.parse({ id: '000', ...project })).toEqual(project);
  });
});

describe('aboutSchema', () => {
  const about = aboutSchema(z.string());
  it('accepts empty frontmatter', () => {
    expect(about.safeParse({}).success).toBe(true);
  });
  it('accepts a headshot that satisfies the schema it is given', () => {
    expect(about.parse({ headshot: 'me.jpg' })).toEqual({ headshot: 'me.jpg' });
  });
  it('rejects a headshot that does not', () => {
    const result = about.safeParse({ headshot: 42 });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['headshot']);
  });
});
