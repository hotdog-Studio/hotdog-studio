import { describe, expect, it } from 'vitest';
import { isCurrent } from '../../src/lib/nav';

describe('isCurrent', () => {
  it.each([
    ['/', '/', true],
    ['/work', '/', false],
    ['/work', '/work', true],
    ['/work/import-photos', '/work', true],
    ['/work/', '/work', true],
    ['/workshop', '/work', false],
    ['/photos', '/work', false],
  ])('isCurrent(%j, %j) is %s', (pathname, href, expected) =>
    expect(isCurrent(pathname, href)).toBe(expected),
  );
});
