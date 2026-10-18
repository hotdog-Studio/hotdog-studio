# hotdog.studio

The source of [hotdog.studio](https://hotdog.studio), Thomas Southcott's portfolio. It is a static [Astro](https://astro.build) site of case studies, photography albums and a public quality report, built to be evidence for its own message: the repository carries a real test suite and quality gates. The design is in the [design spec](docs/superpowers/specs/2026-10-14-hotdog-studio-portfolio-design.md).

## Prerequisites

- Node 24.22, the version pinned in `.node-version`. The minimum is 24.16, because `eslint-plugin-astro` and `astro-eslint-parser` need it. `.npmrc` sets `engine-strict=true`, so `npm ci` and `npm install` refuse to run on anything older, rather than installing a lint toolchain on a Node it does not support.
- Install the dependencies with `npm ci`.
- Install the Playwright browsers once with `npx playwright install chromium firefox webkit`. Linux CI agents add `--with-deps`. Only `npm run test:e2e` needs them.

## Build modes

`SITE_MODE` selects what a build reads and where it writes. `real` is the default, and an unset or empty value means the same. It builds into `dist/`. `fixtures` builds into `dist-fixtures/`, so it never overwrites the real build. Any other value fails the build rather than silently falling back to the real site.

## Scripts

| Script                     | What it does                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Processes the photos (drafts included), then starts the Astro dev server on <http://localhost:4321>. Drafts show here and nowhere else. Without `PHOTOS_DIR` it uses the fixture photos. |
| `npm run build`            | Runs `npm run check:content` and `npm run photos`, then builds the real site into `dist/`. Drafts are left out. It needs `PHOTOS_DIR`.                                                   |
| `npm run build:fixtures`   | Runs the same build with `SITE_MODE=fixtures`, reading `fixtures/` (photos included) and writing `dist-fixtures/`.                                                                       |
| `npm run photos`           | Runs only the photo pipeline: scans the albums, writes the derivatives to `public/photos/` and the manifest to `src/generated/`.                                                         |
| `npm run fixtures:photos`  | Regenerates the committed fixture photos in `fixtures/photos/`. You rarely need this.                                                                                                    |
| `npm run preview:fixtures` | Serves `dist-fixtures/` on <http://localhost:4321>. Build it first.                                                                                                                      |
| `npm run lint`             | Runs `astro check`, ESLint (no warnings allowed) and Prettier's check, then checks the case studies.                                                                                     |
| `npm run format`           | Rewrites every file with Prettier.                                                                                                                                                       |
| `npm run test:unit`        | Runs the Vitest unit and component tests and writes a JUnit report to `reports/junit/unit.xml`.                                                                                          |
| `npm run test:e2e`         | Runs the Playwright suite against the fixture build and writes `reports/junit/e2e.xml`.                                                                                                  |
| `npm run check:content`    | Checks the current mode's case studies against the content rules and fails on any error.                                                                                                 |

## CI order

CI runs these steps in order, and each exits non-zero on failure. They are steps 1 to 6 of the CI contract in section 9 of the design spec. The contract's later steps (container images, tests against the running site and the quality report) are not built yet.

1. `npm ci` installs the locked dependencies.
2. `npm run lint` runs the static checks.
3. `npm run test:unit` runs the unit tests.
4. `npm run build:fixtures` builds the fixture site.
5. `npm run test:e2e` tests that fixture build in the browser.
6. `npm run build` builds the real site. It needs `PHOTOS_DIR` set (see [Photos](#photos)) and fails before building without it.

Step 5 serves what step 4 built, so keep that order.

## Viewing the site

- **Fixture build.** Run `npm run build:fixtures`, then `npm run preview:fixtures`, and open <http://localhost:4321>. It uses made-up case studies that cover every source label, so the site looks complete without any real content.
- **Real content, drafts included.** Run `npm run dev`, which uses real mode. A case study marked `draft: true` in its front matter shows under `npm run dev` and nowhere else, because `npm run build` and `npm run build:fixtures` both leave drafts out.

`astro dev` keeps its content store in `.astro/`, which every mode shares, so switching `SITE_MODE` between dev sessions can print a harmless duplicate-slug warning.

## Writing content

The site's words live in two places:

- `src/content/` holds the case studies (`src/content/work/`, one Markdown file each, named by its URL slug), the bio (`src/content/about.md`) and the "Other things I build" list (`src/content/other-projects.yaml`).
- `src/site.config.ts` holds your name, job title, tagline, pitch, email, links, CV path and the open-to-work banner.

When you write a case study:

- Keep `draft: true` in its front matter until it is finished. A draft shows under `npm run dev` and nowhere else, so you can preview it without publishing it.
- Before a study leaves draft, remove every `<!-- prompt: … -->` comment and every `TODO(thomas)` placeholder. The content check fails the build while a published study still has either.
- Front matter keys are strict. A misspelt key, such as `liveURL` for `liveUrl` or `Draft` for `draft`, fails the build instead of being ignored.
- Quote any YAML value that contains `: `, as the scaffolded summaries are, for example `summary: 'Flaky tests: how I fixed them'`. Inside single quotes, write an apostrophe as `''`. An unquoted `: ` fails the build, which names the line and column.

After editing, run `npm run format`. `npm run lint` checks the formatting too, Markdown included, and fails on any file that Prettier would change.

## Photos

Photos never live in the repository. They sit in a folder outside it, with one sub-folder per album, and `PHOTOS_DIR` points at that folder. The pipeline (`scripts/photos/`) turns each album into resized AVIF and WebP files with all metadata stripped, plus a manifest the pages read. Run it on its own with `npm run photos`; `npm run dev` and `npm run build` run it first.

```
D:\Photos\hotdog-studio\
  iceland-2025\
    album.yaml
    DSC01234.jpg
    DSC01240.jpg
```

The folder name is the album's URL slug, so it may only use lower-case letters, digits and hyphens. Each album needs an `album.yaml`:

```yaml
title: Iceland 2025
date: 2025-06-14 # orders albums, newest first
description: Optional one-liner
cover: DSC01234.jpg # optional; defaults to the first photo
showExif: true # optional, default true
draft: false # optional, default false
photos: # optional per-photo metadata, keyed by filename
  DSC01234.jpg:
    alt: Black sand beach at Reynisfjara under low cloud
    caption: Optional caption
```

- **Formats.** `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff` and `.webp`, in any letter case. Anything else, RAW and HEIC included, fails the build with a list of the files, so export those as JPEG from your editor first.
- **Alt text.** A photo without `alt` gets `<Album title>, photo <n> of <m>` and the build prints a warning naming the album and the files. Write real alt text for every photo before publishing.
- **Drafts.** An album with `draft: true` shows under `npm run dev` and nowhere else. A build never reads, encodes or publishes it.
- **Privacy.** The derivatives carry no EXIF, location or camera serial number. Only the camera, lens, focal length, aperture, shutter speed, ISO and date go into the manifest, and the album page shows them unless `showExif: false`.
- **Problems.** The pipeline reports every problem in the folder in one go, and writes nothing until they are fixed. Two identical files in one album count as a problem.
- **Cache.** Encoding AVIF is slow, so finished derivatives are cached in `.cache/photos/`, keyed by the photo's content. Set `PHOTOS_CACHE_DIR` to keep the cache somewhere else, such as a folder that survives CI workspace clean-ups. Delete the folder to force a full re-encode.
- **Fixtures.** `npm run build:fixtures` always uses the made-up photos in `fixtures/photos/`, whatever `PHOTOS_DIR` says. `npm run dev` falls back to them when `PHOTOS_DIR` is unset, but `npm run build` never does, because it would publish them as yours. `npm run fixtures:photos` regenerates them.

In PowerShell, set the variables for the current window, then run the commands:

```powershell
$env:PHOTOS_DIR = 'D:\Photos\hotdog-studio'
$env:PHOTOS_CACHE_DIR = 'D:\Photos\.cache'
npm run build
```

## End-to-end tests

The Playwright suite tests the fixture build, never the real site or the dev server. It runs in five projects: Chromium, Firefox and WebKit on the desktop, plus Pixel 7 and iPhone 14 emulation.

1. Build the fixtures with `npm run build:fixtures`. The suite serves whatever is in `dist-fixtures/`, so run this first, and again after any change to the site.
2. Run the suite with `npm run test:e2e`. Playwright starts and stops its own preview server on port 4321. It never reuses a running one, so stop `npm run dev` or `npm run preview:fixtures` first, or the run fails straight away.

The HTML report goes to `reports/playwright` and the JUnit report to `reports/junit/e2e.xml`.
