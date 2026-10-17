import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  REQUIRED_H2S,
  checkDirectories,
  checkStudies,
  parseStudy,
} from '../../scripts/content/case-study-rules';

const SECTIONS = REQUIRED_H2S.map((h) => `## ${h}\n\nText.\n`).join('\n');
const md = (front: string, body = SECTIONS) => `---\n${front}\n---\n\n${body}`;
const parsed = (file: string, front: string, body?: string) => parseStudy(file, md(front, body));
const featured = (file: string, order: number) =>
  parsed(file, `title: ${file}\nfeatured: true\nfeaturedOrder: ${order}`);

const H2_RULE = `H2 sections must be exactly Context, Problem, Test strategy, Stack, Results, What I'd change (in that order)`;
const PROMPT_MARKER_RULE =
  'remove the scaffold prompt markers (<!-- prompt: … -->) before publishing';

describe('parseStudy', () => {
  it('reads the flags and the H2s in order', () => {
    expect(featured('a.md', 2)).toEqual({
      file: 'a.md',
      draft: false,
      featured: true,
      featuredOrder: 2,
      h2s: [...REQUIRED_H2S],
      hasPromptMarker: false,
    });
  });
  it('reads a draft with no featuredOrder', () => {
    expect(parsed('a.md', 'title: A\ndraft: true')).toEqual({
      file: 'a.md',
      draft: true,
      featured: false,
      featuredOrder: undefined,
      h2s: [...REQUIRED_H2S],
      hasPromptMarker: false,
    });
  });
  it('counts draft and featured only when the value is exactly true', () => {
    expect(
      parsed('a.md', 'title: A\ndraft: 1\nfeatured: "true"\nfeaturedOrder: "2"'),
    ).toMatchObject({ draft: false, featured: false, featuredOrder: undefined });
  });
  it('reads CRLF files the same as LF files', () => {
    expect(
      parseStudy('a.md', md('title: A\nfeatured: true\nfeaturedOrder: 1').replaceAll('\n', '\r\n')),
    ).toEqual(parseStudy('a.md', md('title: A\nfeatured: true\nfeaturedOrder: 1')));
  });
  it('accepts a curly apostrophe in "What I’d change"', () => {
    expect(
      parsed('a.md', 'title: A', SECTIONS.replace("What I'd change", 'What I’d change')).h2s,
    ).toEqual([...REQUIRED_H2S]);
  });
  it('ignores ## lines inside fenced code blocks', () => {
    const body = SECTIONS.replace('## Stack\n', '```md\n## not a heading\n```\n\n## Stack\n');
    expect(parsed('a.md', 'title: A', body).h2s).toEqual([...REQUIRED_H2S]);
  });
  it('counts only H2s, not an H1 title or a sub-heading', () => {
    const body = `# Title\n\n${SECTIONS.replace('## Results\n', '## Results\n\n### A sub-heading\n')}`;
    expect(parsed('a.md', 'title: A', body).h2s).toEqual([...REQUIRED_H2S]);
  });
  it('does not treat the frontmatter as a heading', () => {
    expect(parsed('a.md', 'title: A', 'Just text.\n').h2s).toEqual([]);
  });
  it('detects scaffold prompt markers', () => {
    expect(
      parsed('a.md', 'title: A', SECTIONS + '\n<!-- prompt: fill me in -->\n').hasPromptMarker,
    ).toBe(true);
  });
  it('names the file when the frontmatter is missing', () => {
    expect(() => parseStudy('a.md', '## Context\n')).toThrow(
      'a.md: frontmatter is missing or not valid YAML',
    );
  });
  it.each([
    ['invalid YAML', '---\ntitle: [unclosed\n---\n'],
    ['a YAML list', '---\n- a\n---\n'],
    ['plain text', '---\njust text\n---\n'],
    ['only a comment', '---\n# nothing here\n---\n'],
  ])('names the file when the frontmatter is %s', (_label, source) => {
    expect(() => parseStudy('a.md', source)).toThrow(
      'a.md: frontmatter is missing or not valid YAML',
    );
  });
});

describe('checkStudies', () => {
  it('passes three featured studies with unique orders and the six sections', () => {
    expect(
      checkStudies([
        featured('a.md', 1),
        featured('b.md', 2),
        featured('c.md', 3),
        parsed('d.md', 'title: D'),
      ]),
    ).toEqual([]);
  });
  it('rejects a fourth featured study, naming all four', () => {
    expect(checkStudies(['a', 'b', 'c', 'd'].map((f, i) => featured(`${f}.md`, i + 1)))).toEqual([
      'More than 3 published case studies are featured: a.md, b.md, c.md, d.md',
    ]);
  });
  it('rejects a duplicate featuredOrder, naming both files', () => {
    expect(checkStudies([featured('a.md', 1), featured('b.md', 1)])).toEqual([
      'featuredOrder 1 is used by more than one published case study: a.md, b.md',
    ]);
  });
  it('lets a study that is not featured keep a featuredOrder another study uses', () => {
    const notFeatured = parsed('b.md', 'title: B\nfeaturedOrder: 1');
    expect(checkStudies([featured('a.md', 1), notFeatured])).toEqual([]);
  });
  it.each([
    ['a missing section', SECTIONS.replace('## Results\n\nText.\n', '')],
    [
      'sections out of order',
      SECTIONS.replace('## Context', '## TEMP')
        .replace('## Problem', '## Context')
        .replace('## TEMP', '## Problem'),
    ],
    ['an extra section', SECTIONS + '\n## Appendix\n'],
  ])('rejects %s and lists what it found', (_label, body) => {
    const [error] = checkStudies([parsed('a.md', 'title: A', body)]);
    expect(error).toMatch(
      /^a\.md: H2 sections must be exactly Context, Problem, Test strategy, Stack, Results, What I'd change \(in that order\); found: /,
    );
  });
  it('lists the H2s it found, or "none"', () => {
    const withoutResults = SECTIONS.replace('## Results\n\nText.\n', '');
    expect(checkStudies([parsed('a.md', 'title: A', withoutResults)])).toEqual([
      `a.md: ${H2_RULE}; found: Context, Problem, Test strategy, Stack, What I'd change`,
    ]);
    expect(checkStudies([parsed('b.md', 'title: B', 'Just text.\n')])).toEqual([
      `b.md: ${H2_RULE}; found: none`,
    ]);
  });
  it('rejects leftover prompt markers', () => {
    expect(checkStudies([parsed('a.md', 'title: A', SECTIONS + '<!-- prompt: x -->')])).toEqual([
      'a.md: remove the scaffold prompt markers (<!-- prompt: … -->) before publishing',
    ]);
  });
  it('ignores drafts for every rule', () => {
    const draft = parsed(
      'z.md',
      'title: Z\ndraft: true\nfeatured: true\nfeaturedOrder: 1',
      '## Context\n<!-- prompt: x -->\n',
    );
    expect(
      checkStudies([featured('a.md', 1), featured('b.md', 2), featured('c.md', 3), draft]),
    ).toEqual([]);
  });
  it('reports collection rules first, then each file in order, the H2s before the marker', () => {
    const unfinished = (file: string, order: number, body: string) =>
      parsed(file, `title: ${file}\nfeatured: true\nfeaturedOrder: ${order}`, body);
    expect(
      checkStudies([
        unfinished('a.md', 2, '## Context\n<!-- prompt: x -->\n'),
        unfinished('b.md', 2, SECTIONS + '<!-- prompt: x -->'),
        unfinished('c.md', 1, SECTIONS),
        unfinished('d.md', 1, SECTIONS),
      ]),
    ).toEqual([
      'More than 3 published case studies are featured: a.md, b.md, c.md, d.md',
      'featuredOrder 1 is used by more than one published case study: c.md, d.md',
      'featuredOrder 2 is used by more than one published case study: a.md, b.md',
      `a.md: ${H2_RULE}; found: Context`,
      `a.md: ${PROMPT_MARKER_RULE}`,
      `b.md: ${PROMPT_MARKER_RULE}`,
    ]);
  });
});

describe('checkDirectories', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  /** Creates a directory inside the temp directory, holding the given files. */
  const makeDir = async (name: string, files: Record<string, string> = {}) => {
    const dir = path.join(tmp, name);
    await fs.mkdir(dir, { recursive: true });
    for (const [file, content] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, file), content);
    }
    return dir;
  };

  it('counts scanned and published files', async () => {
    const dir = await makeDir('work', {
      'published.md': md('title: P'),
      'draft.md': md('title: D\ndraft: true', '## Context\n'),
    });
    expect(await checkDirectories([dir])).toEqual({ scanned: 2, published: 1, errors: [] });
  });
  it('reports a missing directory', async () => {
    const missing = path.join(tmp, 'missing');
    const { errors } = await checkDirectories([missing]);
    expect(errors).toContain(`${missing}: directory not found`);
    expect(errors).toContain(`No case-study files found in: ${missing}`);
  });
  it('fails instead of passing when no files were scanned', async () => {
    const empty = await makeDir('empty');
    const { scanned, errors } = await checkDirectories([empty]);
    expect(scanned).toBe(0);
    expect(errors).toContain(`No case-study files found in: ${empty}`);
  });
  it('names every directory when no files were scanned', async () => {
    const [a, b] = [await makeDir('a'), await makeDir('b')];
    expect((await checkDirectories([a, b])).errors).toEqual([
      `No case-study files found in: ${a}, ${b}`,
    ]);
  });
  it('checks each directory as its own collection', async () => {
    const threeFeatured = Object.fromEntries(
      [1, 2, 3].map((n) => [`s${n}.md`, md(`title: S${n}\nfeatured: true\nfeaturedOrder: ${n}`)]),
    );
    const a = await makeDir('a', threeFeatured);
    const b = await makeDir('b', threeFeatured);
    expect(await checkDirectories([a, b])).toEqual({ scanned: 6, published: 6, errors: [] });
  });
  it('turns a file it cannot parse into an error and still counts it as scanned', async () => {
    const dir = await makeDir('work', { 'broken.md': '## Context\n', 'ok.md': md('title: OK') });
    expect(await checkDirectories([dir])).toEqual({
      scanned: 2,
      published: 1,
      errors: [`${path.join(dir, 'broken.md')}: frontmatter is missing or not valid YAML`],
    });
  });
  it('reports a file it cannot parse before the rule messages', async () => {
    const dir = await makeDir('work', {
      'a.md': md('title: A', '## Context\n'),
      'b.md': '## Context\n',
    });
    const { errors } = await checkDirectories([dir]);
    expect(errors.map((error) => error.split(': ')[0])).toEqual([
      path.join(dir, 'b.md'),
      path.join(dir, 'a.md'),
    ]);
  });
  it('reads only the .md files directly inside a directory, sorted by name', async () => {
    const unfinished = md('title: X', '## Context\n');
    const dir = await makeDir('work', { 'a.md': unfinished, 'B.md': unfinished, 'notes.txt': 'x' });
    await makeDir(path.join('work', 'nested'), { 'c.md': unfinished });
    const { scanned, errors } = await checkDirectories([dir]);
    expect(scanned).toBe(2);
    expect(errors.map((error) => error.split(': ')[0])).toEqual([
      path.join(dir, 'B.md'),
      path.join(dir, 'a.md'),
    ]);
  });
});
