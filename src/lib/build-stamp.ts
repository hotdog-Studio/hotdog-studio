import type { SiteMode } from './site-mode';

const LOCAL_BUILD = 'local build';

/**
 * The footer's build stamp (spec §4.1): `Build #42 · abc1234`, `Build #42` without a commit, or
 * `local build` without a build number. Jenkins can export empty variables, so values are trimmed
 * and a blank one counts as absent. Fixture builds always say `local build`, so the visual
 * baselines don't change with every CI build.
 */
export function formatBuildStamp(
  env: { BUILD_NUMBER?: string | undefined; GIT_COMMIT?: string | undefined },
  mode: SiteMode,
): string {
  const buildNumber = env.BUILD_NUMBER?.trim();
  if (mode === 'fixtures' || !buildNumber) return LOCAL_BUILD;
  const commit = env.GIT_COMMIT?.trim().slice(0, 7);
  return commit ? `Build #${buildNumber} · ${commit}` : `Build #${buildNumber}`;
}
