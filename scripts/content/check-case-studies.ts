import { modePaths, resolveSiteMode } from '../../src/lib/site-mode';
import { checkDirectories } from './case-study-rules';

// The directories are the CLI arguments, or the current mode's case studies when there are none.
const args = process.argv.slice(2);
const dirs =
  args.length > 0 ? args : [`${modePaths[resolveSiteMode(process.env.SITE_MODE)].contentDir}/work`];

const { scanned, published, errors } = await checkDirectories(dirs);

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`check-case-studies: ${scanned} files, ${published} published, OK`);
}
