import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toString } from 'mdast-util-to-string';
import { parse } from 'yaml';
import { MAX_FEATURED } from '../../src/lib/work';

/** The H2 sections every published case study has, in this order (spec §4.4). */
export const REQUIRED_H2S = [
  'Context',
  'Problem',
  'Test strategy',
  'Stack',
  'Results',
  "What I'd change",
] as const;

/** What the collection rules need to know about one case-study file. */
export type ParsedStudy = {
  file: string;
  draft: boolean;
  featured: boolean;
  featuredOrder: number | undefined;
  h2s: string[];
  hasPromptMarker: boolean;
  /** `TODO(thomas)` appears somewhere in the file, the frontmatter included. */
  hasTodoMarker: boolean;
};

const PROMPT_MARKER = '<!-- prompt:';
const TODO_MARKER = 'TODO(thomas)';
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const INVALID_FRONTMATTER = 'frontmatter is missing or not valid YAML';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Splits off the frontmatter, or throws, naming the file, when it is missing, invalid or not a
 * mapping. A YAML syntax error keeps the parser's reason, with its line and column, because this
 * check runs before Astro's and would otherwise hide where the mistake is.
 */
function splitFrontmatter(
  file: string,
  source: string,
): { data: Record<string, unknown>; body: string } {
  const match = FRONTMATTER.exec(source);
  if (match === null) throw new Error(`${file}: ${INVALID_FRONTMATTER}`);
  let data: unknown;
  try {
    // The line break stands in for the opening `---`, so the parser counts lines from the top of
    // the file, as Astro's does, not from the first line inside the fence.
    data = parse(`\n${match[1] ?? ''}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message.trimEnd() : String(error);
    throw new Error(`${file}: ${INVALID_FRONTMATTER}: ${reason}`, { cause: error });
  }
  if (!isRecord(data)) throw new Error(`${file}: ${INVALID_FRONTMATTER}`);
  return { data, body: source.slice(match[0].length) };
}

/**
 * Reads the flags, the H2 headings and the two scaffold checks (prompt markers and `TODO(thomas)`
 * placeholders) from one case-study file.
 *
 * Only the body is parsed as Markdown, so the frontmatter's closing `---` cannot turn the line
 * above it into a setext heading. A real parser also keeps `##` lines inside code fences out.
 * The type checks on the flags belong to the per-entry Zod schema, so a value that is not
 * exactly `true` (or a number, for `featuredOrder`) is simply not counted here.
 */
export function parseStudy(file: string, source: string): ParsedStudy {
  // Windows editors can save a UTF-8 BOM. Node keeps it as U+FEFF, which hides the opening `---`.
  const { data, body } = splitFrontmatter(file, source.replace(/^\uFEFF/, ''));
  const featuredOrder = data['featuredOrder'];
  const h2s = fromMarkdown(body).children.flatMap((node) =>
    // Smart-quote editors write the apostrophe in "What I’d change" as a right single quote.
    node.type === 'heading' && node.depth === 2 ? [toString(node).trim().replaceAll('’', "'")] : [],
  );
  return {
    file,
    draft: data['draft'] === true,
    featured: data['featured'] === true,
    featuredOrder: typeof featuredOrder === 'number' ? featuredOrder : undefined,
    h2s,
    hasPromptMarker: body.includes(PROMPT_MARKER),
    // The summary is in the frontmatter, so the whole file is searched, not just the body.
    hasTodoMarker: source.includes(TODO_MARKER),
  };
}

const fileList = (studies: readonly ParsedStudy[]) => studies.map((s) => s.file).join(', ');

/**
 * The rules that span one collection of case studies (spec §5.2). Drafts are ignored.
 * Collection-level messages come first, then each file's: its H2 message, then its prompt-marker
 * one, then its `TODO(thomas)` one.
 */
export function checkStudies(studies: readonly ParsedStudy[]): string[] {
  const published = studies.filter((study) => !study.draft);
  const featured = published.filter((study) => study.featured);
  const errors: string[] = [];

  if (featured.length > MAX_FEATURED) {
    errors.push(
      `More than ${MAX_FEATURED} published case studies are featured: ${fileList(featured)}`,
    );
  }

  // featuredOrder ranks the featured studies, so a study that is not featured does not compete.
  const byOrder = new Map<number, ParsedStudy[]>();
  for (const study of featured) {
    if (study.featuredOrder === undefined) continue;
    byOrder.set(study.featuredOrder, [...(byOrder.get(study.featuredOrder) ?? []), study]);
  }
  for (const [order, sharing] of [...byOrder].sort(([a], [b]) => a - b)) {
    if (sharing.length > 1) {
      errors.push(
        `featuredOrder ${order} is used by more than one published case study: ${fileList(sharing)}`,
      );
    }
  }

  for (const { file, h2s, hasPromptMarker, hasTodoMarker } of published) {
    if (h2s.length !== REQUIRED_H2S.length || h2s.some((h2, i) => h2 !== REQUIRED_H2S[i])) {
      const found = h2s.length > 0 ? h2s.join(', ') : 'none';
      errors.push(
        `${file}: H2 sections must be exactly ${REQUIRED_H2S.join(', ')} (in that order); found: ${found}`,
      );
    }
    if (hasPromptMarker) {
      errors.push(
        `${file}: remove the scaffold prompt markers (<!-- prompt: … -->) before publishing`,
      );
    }
    if (hasTodoMarker) {
      errors.push(`${file}: replace the ${TODO_MARKER} placeholders before publishing`);
    }
  }
  return errors;
}

const isNotFound = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

/**
 * Checks each directory of case studies as its own collection, and counts the files it scanned.
 * `src/content/work` and `fixtures/content/work` are separate collections, so pooling them would
 * add the real featured studies to the fixtures'. File names are sorted, so the messages come out
 * in the same order, with the same counts, on every OS. The paths in them use the OS's own
 * separator. Files that fail to parse are reported before the rules.
 *
 * Each directory is its own scanning gate (spec §8.1.2): one with no `.md` files fails even when
 * another has some, and one that does not exist is reported as not found.
 */
export async function checkDirectories(
  dirs: readonly string[],
): Promise<{ scanned: number; published: number; errors: string[] }> {
  const errors: string[] = [];
  let scanned = 0;
  let published = 0;

  for (const dir of dirs) {
    let names: string[];
    try {
      names = (await readdir(dir)).filter((name) => name.endsWith('.md')).sort();
    } catch (error) {
      if (!isNotFound(error)) throw error;
      errors.push(`${dir}: directory not found`);
      continue;
    }
    if (names.length === 0) {
      errors.push(`No case-study files found in: ${dir}`);
      continue;
    }

    const studies: ParsedStudy[] = [];
    for (const name of names) {
      const file = join(dir, name);
      const source = await readFile(file, 'utf8');
      try {
        studies.push(parseStudy(file, source));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    scanned += names.length;
    published += studies.filter((study) => !study.draft).length;
    errors.push(...checkStudies(studies));
  }
  return { scanned, published, errors };
}
