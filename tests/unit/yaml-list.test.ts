import { describe, expect, it } from 'vitest';
import { withPositionalIds } from '../../src/lib/yaml-list';

describe('withPositionalIds', () => {
  it('numbers the entries in file order', () => {
    expect(withPositionalIds('- name: B\n- name: A\n')).toEqual([
      { id: '000', name: 'B' },
      { id: '001', name: 'A' },
    ]);
  });
  it('returns an empty list for an empty list', () => {
    expect(withPositionalIds('[]\n')).toEqual([]);
  });
  it('keeps the position as the id even when an entry brings its own', () => {
    expect(withPositionalIds('- id: mine\n  name: A\n')).toEqual([{ id: '000', name: 'A' }]);
  });
  it.each(['name: A\n', '', 'just text\n'])('rejects %j because it is not a list', (text) => {
    expect(() => withPositionalIds(text)).toThrow(
      new Error('other-projects.yaml must be a YAML list'),
    );
  });
});
