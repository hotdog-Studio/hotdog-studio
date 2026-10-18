import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** A fresh empty folder under the OS temp directory. The caller removes it. */
export function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'photo-albums-'));
}

/**
 * Creates `<root>/<slug>` holding the given files and returns its path. A key ending in `/`
 * creates a folder instead of a file.
 */
export async function writeAlbum(
  root: string,
  slug: string,
  files: Record<string, string | Buffer>,
): Promise<string> {
  const dir = join(root, slug);
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const target = join(dir, name);
    if (name.endsWith('/')) {
      await mkdir(target, { recursive: true });
    } else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  return dir;
}
