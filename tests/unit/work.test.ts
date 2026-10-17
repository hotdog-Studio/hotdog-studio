import { describe, expect, it } from 'vitest';
import {
  caseStudyHref,
  isVisible,
  reelRaffleCaseStudyHref,
  selectFeatured,
  sortForIndex,
  sourceLabel,
  type StudyLike,
} from '../../src/lib/work';

const s = (id: string, data: Partial<StudyLike['data']> = {}): StudyLike => ({
  id,
  data: { title: id, featured: false, ...data },
});

describe('isVisible', () => {
  it('hides drafts from builds but shows them in dev', () => {
    expect([isVisible(true, false), isVisible(true, true), isVisible(false, false)]).toEqual([
      false,
      true,
      true,
    ]);
  });
  it('shows published studies in dev as well', () => {
    expect(isVisible(false, true)).toBe(true);
  });
});

describe('selectFeatured', () => {
  it('selects featured studies in featuredOrder, not file order', () => {
    const studies = [
      s('c', { featured: true, featuredOrder: 3 }),
      s('x'),
      s('a', { featured: true, featuredOrder: 1 }),
      s('b', { featured: true, featuredOrder: 2 }),
    ];
    expect(selectFeatured(studies).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('never returns more than three featured studies', () => {
    expect(
      selectFeatured([1, 2, 3, 4].map((n) => s(`f${n}`, { featured: true, featuredOrder: n }))),
    ).toHaveLength(3);
  });
  it('keeps the three with the lowest featuredOrder, whatever the file order', () => {
    const studies = [4, 3, 2, 1].map((n) => s(`f${n}`, { featured: true, featuredOrder: n }));
    expect(selectFeatured(studies).map((x) => x.id)).toEqual(['f1', 'f2', 'f3']);
  });
  it('puts a featured study with no featuredOrder after the numbered ones, by title', () => {
    const studies = [
      s('z', { featured: true }),
      s('b', { featured: true, featuredOrder: 2 }),
      s('a', { featured: true }),
    ];
    expect(selectFeatured(studies).map((x) => x.id)).toEqual(['b', 'a', 'z']);
  });
  it('ignores a featuredOrder left on a study that is not featured', () => {
    const studies = [
      s('stale', { featuredOrder: 1 }),
      s('a', { featured: true, featuredOrder: 2 }),
    ];
    expect(selectFeatured(studies).map((x) => x.id)).toEqual(['a']);
  });
  it('does not reorder the array it is given', () => {
    const studies = Object.freeze([
      s('b', { featured: true, featuredOrder: 2 }),
      s('a', { featured: true, featuredOrder: 1 }),
    ]);
    expect(selectFeatured(studies).map((x) => x.id)).toEqual(['a', 'b']);
    expect(studies.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('sortForIndex', () => {
  it('sorts the index: featured, then order, then unordered by title', () => {
    const studies = [
      s('zeta'),
      s('beta', { order: 2 }),
      s('alpha'),
      s('feat', { featured: true, featuredOrder: 1 }),
      s('gamma', { order: 1 }),
    ];
    expect(sortForIndex(studies).map((x) => x.id)).toEqual([
      'feat',
      'gamma',
      'beta',
      'alpha',
      'zeta',
    ]);
  });
  it('lists every featured study first, by featuredOrder rather than order', () => {
    const studies = [
      s('rest', { order: 0 }),
      s('f1', { featured: true, featuredOrder: 1, order: 9 }),
      s('f4', { featured: true, featuredOrder: 4, order: 1 }),
      s('f2', { featured: true, featuredOrder: 2, order: 8 }),
      s('f3', { featured: true, featuredOrder: 3, order: 2 }),
    ];
    expect(sortForIndex(studies).map((x) => x.id)).toEqual(['f1', 'f2', 'f3', 'f4', 'rest']);
  });
  it('breaks ties on order by title, ignoring case', () => {
    const studies = [
      s('banana', { order: 1 }),
      s('cherry', { title: 'Cherry', order: 1 }),
      s('apple', { order: 1 }),
    ];
    expect(sortForIndex(studies).map((x) => x.id)).toEqual(['apple', 'banana', 'cherry']);
  });
  it('counts an order of 0 as numbered', () => {
    expect(sortForIndex([s('a'), s('z', { order: 0 })]).map((x) => x.id)).toEqual(['z', 'a']);
  });
  it('does not reorder the array it is given', () => {
    const studies = Object.freeze([s('b', { order: 2 }), s('a', { order: 1 })]);
    expect(sortForIndex(studies).map((x) => x.id)).toEqual(['a', 'b']);
    expect(studies.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('selectFeatured and sortForIndex', () => {
  it('return the study objects they were given, so a page keeps every other field', () => {
    const entry = { ...s('a', { featured: true, featuredOrder: 1 }), body: 'Hello' };
    const [featured] = selectFeatured([entry]);
    const [first] = sortForIndex([entry]);
    expect(featured).toBe(entry);
    expect(first).toBe(entry);
    // Reading `body` type-checks only while the element type survives the call.
    expect(featured?.body).toBe('Hello');
  });
});

describe('sourceLabel', () => {
  it.each([
    ['public', 'Public'],
    ['sanitized', 'Public edition'],
    ['private', 'Private'],
  ] as const)('labels %s as %s', (source, label) => {
    expect(sourceLabel(source)).toBe(label);
  });
});

describe('caseStudyHref', () => {
  it('links to the study under /work', () => {
    expect(caseStudyHref('import-photos')).toBe('/work/import-photos');
  });
});

describe('reelRaffleCaseStudyHref', () => {
  it('links the Reel Raffle case study only when it is visible', () => {
    expect(reelRaffleCaseStudyHref([s('reel-raffle')])).toBe('/work/reel-raffle');
    expect(reelRaffleCaseStudyHref([s('other')])).toBeUndefined();
  });
  it('matches the id exactly, not the title or part of the id', () => {
    const titled = s('reel-raffle', { title: 'Reel Raffle' });
    expect(reelRaffleCaseStudyHref([titled])).toBe('/work/reel-raffle');
    const lookalikes = [s('other', { title: 'reel-raffle' }), s('reel-raffle-notes')];
    expect(reelRaffleCaseStudyHref(lookalikes)).toBeUndefined();
  });
});
