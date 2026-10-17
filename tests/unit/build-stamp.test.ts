import { describe, expect, it } from 'vitest';
import { formatBuildStamp } from '../../src/lib/build-stamp';

describe('formatBuildStamp', () => {
  it.each([
    [{ BUILD_NUMBER: '42', GIT_COMMIT: 'abc1234def5678' }, 'Build #42 · abc1234'],
    [{ BUILD_NUMBER: '42' }, 'Build #42'],
    [{ BUILD_NUMBER: '42', GIT_COMMIT: '' }, 'Build #42'],
    [{}, 'local build'],
    [{ BUILD_NUMBER: '', GIT_COMMIT: '' }, 'local build'],
    [{ BUILD_NUMBER: '  ' }, 'local build'],
    [{ GIT_COMMIT: 'abc1234def' }, 'local build'],
    // Both values are trimmed before use, and a blank commit counts as absent too.
    [{ BUILD_NUMBER: ' 42 ', GIT_COMMIT: '  abc1234def  ' }, 'Build #42 · abc1234'],
    [{ BUILD_NUMBER: '42', GIT_COMMIT: '   ' }, 'Build #42'],
  ])('real mode: %j → %s', (env, expected) => expect(formatBuildStamp(env, 'real')).toBe(expected));

  it('fixture builds always say local build, so visual baselines stay stable', () => {
    expect(formatBuildStamp({ BUILD_NUMBER: '42', GIT_COMMIT: 'abc1234def' }, 'fixtures')).toBe(
      'local build',
    );
  });
});
