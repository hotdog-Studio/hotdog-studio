import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { makeFixtureImage, type FixtureImageOptions } from './fixture-image';

// Writes the committed JPEG originals. The album.yaml files are written by hand
// and committed, so this script never touches them.
const ROOT = path.join('fixtures', 'photos');

type Fixture = { file: string; width: number; height: number; takenAt?: string; orientation?: 6 };

const FIXTURES: Fixture[] = [
  { file: 'album-newer/newer-1.jpg', width: 1600, height: 1067, takenAt: '2025:06:14 09:30:00' },
  {
    file: 'album-newer/newer-2.jpg',
    width: 600,
    height: 900,
    orientation: 6,
    takenAt: '2025:06:14 10:15:00',
  },
  { file: 'album-newer/newer-3.jpg', width: 1200, height: 800 },
  { file: 'album-older/older-1.jpg', width: 1200, height: 800, takenAt: '2024:09:01 08:00:00' },
  { file: 'album-older/older-2.jpg', width: 1200, height: 800, takenAt: '2024:09:01 08:05:00' },
  // The newest date, so a leaked draft would show at the top.
  { file: 'album-draft/draft-1.jpg', width: 800, height: 533, takenAt: '2026:01:01 12:00:00' },
];

for (const { file, width, height, takenAt, orientation } of FIXTURES) {
  const options: FixtureImageOptions = {
    width,
    height,
    label: path.basename(file, '.jpg'),
    orientation,
    exif: { takenAt },
  };
  const target = path.join(ROOT, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await makeFixtureImage(options));
  console.log(`wrote ${target}`);
}
