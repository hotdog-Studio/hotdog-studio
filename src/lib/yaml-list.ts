import { parse } from 'yaml';

/**
 * Parses a YAML list and gives each entry the id `000`, `001`, ... by its position in the file.
 *
 * Astro's `file()` loader needs an `id` on every entry. Without one it logs an error and builds an
 * empty collection while the build still succeeds. Positional ids keep `other-projects.yaml` a
 * plain list, and they win over any `id` an entry brings, so they stay unique.
 */
export function withPositionalIds(text: string): Array<Record<string, unknown> & { id: string }> {
  const parsed: unknown = parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('other-projects.yaml must be a YAML list');
  }
  return parsed.map((entry: Record<string, unknown>, index) => ({
    ...entry,
    id: String(index).padStart(3, '0'),
  }));
}
