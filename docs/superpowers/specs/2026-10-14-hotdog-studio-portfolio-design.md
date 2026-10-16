# hotdog.studio — Portfolio Site Design Spec

- **Date:** 2026-10-14
- **Status:** Draft for owner review
- **Owner:** Thomas Southcott (github.com/thomassouthcott)
- **Domain:** https://hotdog.studio

## 0. How to use this spec

This is the design for **project 1 of 5** (see §13). To implement it, open a fresh
Claude Code session in this repository and ask it to write an implementation plan
from this spec (the `superpowers:writing-plans` skill), then execute that plan.

Anything chosen during design without Thomas's explicit confirmation is listed in
§14. Content Thomas has to supply is listed in §15.

---

## 1. Purpose and success criteria

Thomas is a QA engineer who mainly builds test automation. Professionally:
Selenium/Java, C#, a custom C# CLI BDD tool, C++ GoogleTest with protobuf and
memory manipulation, and Spring BDD across multiple frameworks. Personally: a
Cypress stack whose source is private. hotdog.studio is his personal site.

- **Now — job hunting.** A hiring manager or recruiter should leave convinced to
  interview him. Within about 30 seconds on the home page they can see his role,
  three featured case studies, a CV link and how to contact him.
- **Later — personal presence.** Turning off one setting (`openToWork.enabled`)
  removes the job-hunting framing with no redesign.
- **The site is evidence.** Its public repo carries a real test suite and quality
  gates, and `/quality` shows the results of the pipeline run that shipped the
  current version. A QA portfolio without tests would undercut its own message.
- **It references Reel Raffle** (https://reelraffle.org), a product Thomas built
  and runs: a group movie-night picker using the TMDB API.
- **It hosts his photography** as albums.
- **It fixes hotdog.studio,** which currently returns 503 and is linked from his
  GitHub profile.

### Success criteria

1. hotdog.studio serves the site over HTTPS from Thomas's homelab.
2. Every quality gate in §8 passes for the deployed build, and `/quality` shows
   that run.
3. Lighthouse (mobile) on the key pages meets the budgets in §8.7.
4. No published image contains EXIF, XMP or IPTC metadata, and photo originals
   never enter the git repo or the Docker image.
5. With `openToWork.enabled: false` the banner and the home-page CV button
   disappear and nothing else changes.

## 2. Non-goals (v1)

- No server-side code, CMS, database, login or admin UI.
- No contact form (it would need a backend and attracts spam). An email link and
  LinkedIn instead.
- No blog, comments or newsletter. Photography is albums only.
- No analytics. A self-hosted Umami could be added later.
- No Jenkinsfile. Thomas writes it; this spec defines the npm-script contract it
  calls (§9).
- None of the related projects in §13.

---

## 3. Architecture

```
Thomas edits content ──git push──▶ GitHub (public repo)
Thomas copies photo exports ─────▶ PHOTOS_DIR on homelab (private, never in git)
                                         │
              Jenkins on homelab (polls the repo; Thomas's Jenkinsfile)
                                         │  calls the npm scripts in §9
  lint → unit → build:fixtures → e2e + visual
       → build (real) → candidate image → gates against candidate container
       → quality:summary → release image (= candidate + summary.json) → release smoke
                                         │
                       image hotdog-studio:<BUILD_NUMBER>
                                         │  docker compose up -d
Visitor ─▶ Cloudflare (proxy, TLS, HSTS) ─▶ Nginx Proxy Manager
        ─▶ hotdog-studio container (nginx-unprivileged, :8080, Docker network only)
```

- **Astro** with static output only (`output: 'static'`) and strict TypeScript.
- **Content** is Markdown and YAML in Astro content collections with Zod schemas.
  Invalid content fails the build.
- **Photos** are processed before the Astro build by a script that reads originals
  from `PHOTOS_DIR` and writes web derivatives with all metadata stripped (§6).
- **Client JavaScript** only where it is needed: the lightbox on album pages and
  the renderer on `/quality`. Every other page ships zero JS.
- **Serving** is plain static files in `nginxinc/nginx-unprivileged` (alpine). It
  runs non-root on a read-only filesystem and is reachable only on the Docker
  network it shares with Nginx Proxy Manager.
- **Versions:** latest stable Astro, current Node LTS and current Playwright at
  implementation time, with exact versions pinned in `package.json`. The
  Playwright Docker image tag must match the `@playwright/test` version.

### 3.1 Build modes

One switch, `SITE_MODE`, selects every input:

| | `SITE_MODE=real` (default) | `SITE_MODE=fixtures` |
|---|---|---|
| Content collections | `src/content/` | `fixtures/content/` |
| Site config (`@site-config` Vite alias) | `src/site.config.ts` | `fixtures/site.config.ts` |
| Photos | `$PHOTOS_DIR` (**required** for `build`; see §6.6) | `fixtures/photos/` |
| Output directory | `dist/` | `dist-fixtures/` |
| `/quality/summary.json` | added later in the release image (§10.1) | copied from `fixtures/quality/summary.json` |

Behaviour tests run against the fixture build, so they don't break when Thomas
edits his content. Quality gates run against the real build, because that is what
ships.

**Drafts** (`draft: true` on case studies and albums) appear only in
`npm run dev`. Every `build*` command excludes them.

---

## 4. Pages

| Route | Purpose |
|---|---|
| `/` | Open-to-work banner, hero, 3 featured case studies, Reel Raffle card, latest photos |
| `/work` | All case studies, plus an "Other things I build" strip |
| `/work/[slug]` | One case study |
| `/photos` | Album grid |
| `/photos/[album]` | Photo grid and lightbox |
| `/quality` | Results of the pipeline run that shipped this build |
| `/about` | Bio, CV download, contact |
| `404` | Custom not-found page, served with HTTP 404 |

### 4.1 Global layout

- **Header:** the name "Thomas Southcott" links home, alongside the hotdog.studio
  icon (§15). Navigation: Work, Photos, About, with `aria-current="page"` on the
  active item. A skip link jumps to `<main>`.
- **Footer:** GitHub, LinkedIn, email and Reel Raffle links. A line "Built with
  Astro, tested with Playwright" links to `/quality`. A build stamp reads
  `Build #<BUILD_NUMBER> · <short GIT_COMMIT>`, or `local build` when those
  variables are absent.
- `<html lang="en-GB">`, and all copy uses British English.

### 4.2 `/` Home

1. **Open-to-work banner**, shown only when `openToWork.enabled`. Text:
   `openToWork.message`.
2. **Hero:** name, `tagline` (one line), `pitch` (2–3 sentences), and buttons:
   - "See my work" → `/work`
   - "Download CV" → `cv`, shown only when `openToWork.enabled`
   - "Email me" → `mailto:` the configured email
3. **Featured work:** up to 3 cards for case studies with `featured: true`, sorted
   by `featuredOrder`. Each card shows the title, summary, stack tags and source
   badge (Public / Public edition / Private). The section is hidden when there are
   none.
4. **Reel Raffle card:** headed "Built and shipped", with the name, a one-liner
   and a link to https://reelraffle.org. It also links to `/work/reel-raffle`, but
   only when that case study is published, so the link never points at a draft or
   a missing page.
5. **Latest photos:** 6 thumbnails from the newest album, linking to the album.
   Hidden when there are no albums.

### 4.3 `/work`

- All published case studies: featured first (by `featuredOrder`), then the rest by
  `order` ascending, then by title.
- "Other things I build" strip from `other-projects.yaml`: name, one-liner and repo
  link for each.

### 4.4 `/work/[slug]`

- **Header:** title, summary, role, period, stack tags and source badge, plus links
  to the repo and live site where present.
- **Source block** by `source`:
  - `public`: repo link and any `badges`.
  - `sanitized`: repo link, plus a callout "Public edition of a private framework"
    followed by `privateNote`.
  - `private`: callout "Source is private. Happy to walk through it in interview."
    No repo link; the schema forbids one.
- **Body:** Markdown with exactly these H2 sections, in this order: **Context**,
  **Problem**, **Test strategy**, **Stack**, **Results**, **What I'd change**.
  This is enforced by `scripts/content/check-case-studies.ts` (§8.2).
- Code blocks use Astro's built-in Shiki highlighting, done at build time with no
  client JS.
- Diagrams are SVG or PNG files referenced from the Markdown. No Mermaid, which
  would need client JS or another build plugin.

### 4.5 `/photos`

- An album grid, newest first. Each tile shows the cover, title, date
  (`Month YYYY`) and photo count.

### 4.6 `/photos/[album]`

- Title, date and description, then a responsive grid of uniform 3:2 cells. Each
  thumbnail uses `object-fit: cover`; the lightbox shows the uncropped image.
- **Works without JavaScript:** each thumbnail is an `<a href="<largest WebP>">`
  wrapping a `<picture>` with AVIF and WebP `srcset`s, explicit `width` and
  `height`, `loading="lazy"` below the fold, and the dominant colour as a
  placeholder background.
- **Lightbox** (progressive enhancement, native `<dialog>`):
  - Opens when a thumbnail is activated. Shows a suitable size via `srcset`, the
    caption, and an EXIF line when the album's `showExif` is on, for example
    `Sony A7 III · 35 mm · f/1.8 · 1/250 s · ISO 100`.
  - Prev/next buttons, the ← and → keys, and a counter (`3 / 24`). Esc closes it,
    and focus returns to the thumbnail that opened it.
  - Updates the URL hash to `#<photoId>` with `history.replaceState`. Loading an
    album URL with a valid hash opens that photo; closing clears the hash.
  - Preloads the neighbouring images. Respects `prefers-reduced-motion` by having
    no transitions.
  - No swipe gestures in v1; the prev/next buttons work on touch.

### 4.7 `/quality`

- Fetches `/quality/summary.json` (same origin) and renders:
  - build number, commit (linked to GitHub), timestamp and CI name;
  - one row per gate with its status and key numbers;
  - content stats.
- If the file is missing or the fetch fails, it shows "No pipeline results were
  published with this build." and a link to the repo. A `<noscript>` link points to
  the raw JSON.
- A short paragraph explains what each gate checks and that these are the results
  of the run that shipped this exact version.
- The renderer is a small TypeScript module, unit-tested on its own (§8.2).

### 4.8 `/about`

- Bio from `about.md`, an optional headshot, a CV download link (always shown
  here, whatever `openToWork` says), and contact links.

### 4.9 `404`

- A friendly message with links to Home, Work and Photos. nginx serves it with
  status 404.

### 4.10 SEO and metadata

- `site: 'https://hotdog.studio'`. Canonical URLs have **no trailing slash**: set
  `trailingSlash: 'never'` with `build.format: 'directory'`, and nginx maps the
  URLs to files (§10.2).
- A `<title>` and meta description on every page; case studies use `summary`.
- Open Graph and Twitter card tags. The default image is `public/og-default.png`;
  case studies use their `cover` and albums their cover derivative.
- `@astrojs/sitemap`, plus a `robots.txt` that allows everything and points to the
  sitemap.
- JSON-LD `Person` on the home page: name, url, jobTitle, and `sameAs` for GitHub,
  LinkedIn and Reel Raffle.
- Favicons generated from the hotdog.studio icon.

---

## 5. Content model

### 5.1 Site config — `src/site.config.ts` (fixtures: `fixtures/site.config.ts`)

Validated with Zod when the build starts. Imported everywhere as `@site-config`.

```ts
export default {
  name: 'Thomas Southcott',
  jobTitle: string,            // JSON-LD and meta
  tagline: string,             // one line
  pitch: string,               // 2–3 sentences
  email: string,               // public address (see §14, item 8)
  links: {
    github: 'https://github.com/thomassouthcott',
    linkedin: string,
    reelRaffle: 'https://reelraffle.org',
  },
  cv: '/cv/thomas-southcott-cv.pdf',
  openToWork: { enabled: boolean, message: string },
};
```

### 5.2 Case studies — `<content>/work/*.md`

The slug is the filename. Frontmatter:

| Field | Type | Rules |
|---|---|---|
| `title` | string | required |
| `summary` | string | required, ≤ 160 chars (cards and meta description) |
| `source` | `'public' \| 'sanitized' \| 'private'` | required |
| `repo` | URL | required for `public` and `sanitized`; must be absent for `private` |
| `privateNote` | string | required for `sanitized`; must be absent otherwise |
| `liveUrl` | URL | optional |
| `stack` | string[] | required, at least 1 |
| `role` | string | optional |
| `period` | string | optional, e.g. `2021–2023` |
| `featured` | boolean | default `false` |
| `featuredOrder` | integer | required when `featured` |
| `order` | integer | optional; sorts the non-featured studies |
| `badges` | `{ label, src, href }[]` | optional; `public` and `sanitized` only; `src` host must be `img.shields.io` or `github.com` |
| `cover` | image path | optional |
| `draft` | boolean | default `false` |

Per-entry rules use Zod refinements. Rules across the collection are checked by
`scripts/content/check-case-studies.ts`, which fails the build:

- at most 3 published studies have `featured: true`;
- `featuredOrder` values are unique;
- every published study has exactly the six H2s from §4.4, in order;
- no published study contains a scaffold prompt marker (`<!-- prompt:`).

**Initial set.** The implementer scaffolds these files, each with `draft: true` and
a `<!-- prompt: … -->` comment under every H2 to guide Thomas. Thomas writes the
prose and removes `draft` when each one is ready.

| Slug | Working title | `source` | Suggested `featured` | Notes |
|---|---|---|---|---|
| `import-photos` | import-photos: a tested photo-import CLI | public | 1 | repo `thomassouthcott/import-photos`; about 950 lines of pytest with pytest-mock; add badges once CI exists (§13, project 3) |
| `cypress-framework` | My Cypress framework | private | 2 | becomes `sanitized` once the public repo exists (§13, project 4) |
| `cpp-googletest-protobuf` | C++ testing with GoogleTest and protobuf | private | 3 | NDA-safe: diagrams and pseudo-code only |
| `spring-bdd` | Spring BDD across frameworks | private | | |
| `csharp-bdd-cli` | A C# CLI BDD framework | private | | |
| `tdd-coaching` | Coaching TDD at Cubic Transportation | public | | repo `thomassouthcott/TTD-JUnit` |
| `reel-raffle` | Reel Raffle | private | | `liveUrl: https://reelraffle.org`; the repo is not public. Its public test suite (§13, project 2) is linked here once it exists |

### 5.3 Other projects — `<content>/other-projects.yaml`

A list of `{ name, description, repo }`. Initial entries: AutoStreamDeck, Keybrook
and Elden-Ring-Fullscreen-Map. Left out on purpose: PolynomialCalculator (it has
committed build artifacts; add it once cleaned up, §13 project 3),
FirebaseTemplate (from 2019), and forks.

### 5.4 About — `<content>/about.md`

The bio body in Markdown, with an optional `headshot` image in frontmatter.

### 5.5 Photo albums — `$PHOTOS_DIR/<album-slug>/`

```
$PHOTOS_DIR/
  iceland-2025/
    album.yaml
    DSC01234.jpg
    DSC01240.jpg
```

`album.yaml`:

```yaml
title: Iceland 2025
date: 2025-06-14            # orders albums, newest first
description: Optional one-liner
cover: DSC01234.jpg         # optional; defaults to the first photo
showExif: true              # optional, default true
draft: false                # optional, default false
photos:                     # optional per-photo metadata, keyed by filename
  DSC01234.jpg:
    alt: Black sand beach at Reynisfjara under low cloud
    caption: Optional caption
```

- The album slug is the folder name and must match `^[a-z0-9-]+$`.
- Supported originals: `.jpg .jpeg .png .tif .tiff .webp` (case-insensitive).
  Anything else fails the build with a list of the files, including RAW formats
  such as `.ARW` and `.CR2`, and HEIC. Export JPEGs from your editor first.
- `PHOTOS_DIR` is a directory on the homelab that the Jenkins agent can read, for
  example an SMB or NFS share Thomas copies exports into. It is never committed.

### 5.6 CV — `public/cv/thomas-southcott-cv.pdf`

Committed, so it is public. It must be the public-safe version: no home address or
personal phone number.

---

## 6. Photo pipeline — `scripts/photos/process.ts`

Runs as the first step of `dev`, `build` and `build:fixtures`. It uses sharp for
image work and exifr for reading EXIF.

### 6.1 Validation

- Each album folder has a valid `album.yaml` (Zod), a valid slug, at least one
  supported photo, and a `cover` that exists if one is set. Album slugs are unique.
- Every key under `photos:` names a file that exists.
- Hidden files are ignored.

### 6.2 EXIF allowlist

Only these tags are read: `Make`, `Model`, `LensModel`, `FocalLength`, `FNumber`,
`ExposureTime`, `ISO` and `DateTimeOriginal`. `DateTimeOriginal` is reduced to a
date (`YYYY-MM-DD`). They are formatted into display fields. Nothing else read from
the originals reaches the manifest. That includes GPS, body and lens serial
numbers, owner and artist names, and the time of day.

### 6.3 Derivatives

- `.rotate()` to auto-orient from EXIF, then convert to sRGB.
- Widths come from the ladder `[480, 960, 1600, 2400]`, keeping only widths
  smaller than the original, plus `min(originalWidth, 2400)`. Never enlarge.
- Encode both **AVIF** and **WebP**.
- Strip all EXIF, XMP and IPTC. An sRGB ICC profile is allowed. Never call sharp's
  `keepMetadata`, `withMetadata` or `keepExif`.
- **Photo id** = the first 10 hex characters of the SHA-256 of the original file's
  bytes. Output path: `public/photos/<album>/<id>-<width>.<avif|webp>`. Original
  filenames never appear in the output.
- The dominant colour (`sharp().stats().dominant`) becomes the placeholder.

### 6.4 Ordering and alt text

- Albums are ordered by `date` descending; photos by `DateTimeOriginal` ascending,
  falling back to filename.
- Alt text comes from `album.yaml`. When it is missing the fallback is
  `"<Album title>, photo <n> of <m>"`, and the script logs a warning listing those
  files. The count of photos with written alt text is reported in the quality
  summary.

### 6.5 Manifest

Written to `src/generated/photos.json` (gitignored) and typed by a shared Zod
schema in `src/lib/photos-schema.ts`:

```ts
type PhotoManifest = {
  albums: {
    slug: string; title: string; date: string; description?: string;
    showExif: boolean; coverId: string; photos: Photo[];
  }[];
};
type Photo = {
  id: string; alt: string; altIsFallback: boolean; caption?: string;
  width: number; height: number; dominantColor: string;
  sources: { avif: { w: number; src: string }[]; webp: { w: number; src: string }[] };
  exif?: { camera?: string; lens?: string; focalLength?: string;
           aperture?: string; shutter?: string; iso?: number; takenOn?: string };
};
```

### 6.6 Modes, caching and failure behaviour

- `npm run dev` uses `PHOTOS_DIR` when set, otherwise `fixtures/photos`, and logs
  which one it used.
- `SITE_MODE=fixtures` always uses `fixtures/photos`.
- `npm run build` (real mode) **exits 1** if `PHOTOS_DIR` is unset, missing or
  contains no albums. That way it can never quietly ship fixture photos.
- `public/photos/` is cleaned at the start of every run.
- **Cache:** `PHOTOS_CACHE_DIR` (default `.cache/photos`), keyed by
  `<id>-<width>.<ext>` plus a `PIPELINE_VERSION` constant. A cache hit is copied
  instead of re-encoded, because AVIF encoding is slow. Bump `PIPELINE_VERSION`
  whenever encoding settings change.

---

## 7. Visual direction

These are constraints, not a finished design. **Milestone M1 (§16) ends with a
check-in where Thomas sees the home and case-study pages before the rest are
built.**

- **Feel:** calm, typographic and confident. The work and the photos carry the
  personality, with a small hotdog.studio wink in the logo and the 404 page.
- **Type:** the system UI font stack for text and a monospace stack for stack tags
  and code. A fluid type scale using `clamp()`. No web fonts and no third-party
  font CDNs.
- **Colour:** neutral greys plus one accent, mustard (a nod to the name), for
  links, focus rings and badges. Text in the accent colour must reach 4.5:1
  contrast in both themes. Starting points: `#8a6500` on light backgrounds (about
  5.3:1 on white) and `#f2c230` on dark (about 11:1 on `#111`). The axe gate
  (§8.5) is the final judge.
- **Themes:** light and dark via `prefers-color-scheme` only, with no toggle. The
  lightbox backdrop is near-black in both.
- **Layout:** prose up to about 70ch wide; album pages up to about 1400px. 16px
  side gutters on mobile and no horizontal scroll at 320px wide.
- **Motion:** minimal. Disabled under `prefers-reduced-motion`.

---

## 8. Quality gates and testing

The test suite is part of the showcase. Tests must read well: descriptive names,
Playwright fixtures plus small page objects (Home, CaseStudy, Album/Lightbox), no
arbitrary waits, and `retries: 0`. A flaky test is a bug to fix, not to retry.

### 8.1 Principles

1. **Behaviour tests run on the fixture build, quality gates on the real one**
   (§3.1).
2. **No vacuous passes.** Every scanning gate asserts it scanned a non-zero number
   of items (routes, links, image files). A wrong path fails instead of passing on
   nothing.
3. **Negative controls.** The fixture originals deliberately carry fake GPS EXIF
   (0°N 0°E) and a fake body serial number, and a unit test asserts they do. That
   proves the privacy gate can detect what it scans for.
4. **Machine-readable results.** Every gate writes to `reports/`, using JUnit XML
   wherever the tool supports it, so Jenkins' `junit` step works unchanged.

### 8.2 Static checks and unit/component tests

- `npm run lint`: `astro check`, ESLint, `prettier --check`, and
  `scripts/content/check-case-studies.ts`.
- `npm run test:unit` (Vitest → `reports/junit/unit.xml`) covers:
  - **Content schema:** every `source` × `repo`/`privateNote` combination; the
    `summary` length limit; the `badges` host rule.
  - **Case-study checker:** more than 3 featured, duplicate `featuredOrder`,
    missing or out-of-order H2s, leftover prompt markers. Drafts are ignored.
  - **Photo pipeline:**
    - EXIF allowlist mapping: allowed fields come through; GPS and serial numbers
      never do.
    - Ids are deterministic.
    - The width ladder never enlarges.
    - EXIF orientation is applied (a fixture tagged Orientation 6 comes out
      portrait).
    - Read back through sharp, the output carries no EXIF, XMP or IPTC.
    - Unsupported formats, a bad `album.yaml`, a missing cover or a bad slug each
      give a clear error.
    - A cache hit skips encoding.
    - Real mode without `PHOTOS_DIR` exits non-zero.
  - **Negative control:** the fixture originals contain GPS and a serial number.
  - **Quality summary:**
    - Aggregation from JUnit XML, axe JSON, LHCI JSON, linkinator JSON and the
      privacy report.
    - A missing or failed gate makes `quality:summary` exit non-zero.
    - The output validates against the schema.
  - **`/quality` renderer:** the passed, failed-fetch and missing-file states.
  - **Components** (Astro Container API):
    - The open-to-work banner and the CV button render when `enabled` and don't
      when disabled.
    - The source block for each `source` value; `private` renders no repo link.

### 8.3 End-to-end functional — fixture build

Playwright against `dist-fixtures/` served by `astro preview` on `:4321`. Projects:
`chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 7) and `mobile-safari`
(iPhone 14). Output: `reports/junit/e2e.xml` and `reports/playwright/`.

- **Navigation:** the header reaches every section, `aria-current` is correct, and
  the skip link moves focus to `<main>`.
- **Home:** the banner shows; exactly the 3 featured fixtures appear, in
  `featuredOrder`; the Reel Raffle card links to https://reelraffle.org; the latest
  photos come from the newest fixture album.
- **Work:** all published fixtures are listed, the draft is absent, and the "Other
  things I build" strip renders.
- **Case study:** each `source` variant renders its block. The `private` fixture
  has no repo link.
- **Photos:**
  - Albums are listed newest first and the draft album is absent.
  - The lightbox opens by click and by Enter; ←/→ and the buttons navigate; Esc
    closes it and focus returns to the thumbnail.
  - The hash updates, and loading the album with a hash opens that photo.
  - The EXIF line appears only in the album with `showExif: true`.
  - A photo with no alt text in `album.yaml` gets the fallback alt.
- **No JavaScript** (a context with `javaScriptEnabled: false`): thumbnails link
  to a full-size image that loads.
- **`/quality`:** renders the fixture summary; if the request is intercepted to
  404, it shows the empty state.
- **Global:** an `afterEach` fixture fails the test on any console error or
  uncaught page error.

### 8.4 Visual regression — fixture build

- Chromium only, always run inside the pinned Playwright Docker image so rendering
  is deterministic. Baselines are generated in the same image with
  `npm run test:visual:update`, which wraps `docker run`.
- **Pages:** home, work index, one case study, photos index, one album, the
  lightbox open, 404, and quality.
- **Each page at** 1280×800 and 390×844, in light and dark scheme.
- Small `maxDiffPixelRatio`. Because fixture mode swaps in the fixture site config
  and content, baselines change only when the design changes, not when Thomas
  edits his copy.

### 8.5 Accessibility — real build, against the candidate container

- `@axe-core/playwright` over **every route**, found by walking `dist/` for
  `.html` files. The test asserts the route count is above zero.
- Tags: `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`. **Zero violations** allowed.
- Runs in both light and dark scheme, plus the lightbox-open state on the newest
  album.
- Output: `reports/a11y/results.json` and a JUnit file.

### 8.6 Smoke, links and privacy — real build

- **Smoke**, against the candidate container: every route returns 200 and has a
  `<title>` and exactly one `<h1>`, with no console errors and no CSP violations
  (a `securitypolicyviolation` listener).
- **Links** with linkinator, against the candidate container, recursive. Any
  broken internal link fails. External links are checked too, with 2 retries and
  a documented skip list (`linkedin.com` always answers bots with 999). Asserts
  the number of links checked is above zero.
- **Privacy:** `scripts/privacy-scan.ts` reads every image file under `dist/` with
  sharp. Any file reporting `exif`, `xmp` or `iptc` fails the gate, and every
  offending path is listed. Asserts the number of files scanned is above zero.
  Output: `reports/privacy.json`.

### 8.7 Lighthouse — real build, against the candidate container

- LHCI with mobile emulation, median of 3 runs, using Playwright's Chromium via
  `CHROME_PATH`.
- **Pages,** computed in `lighthouserc.cjs`: `/`, the first case-study page
  found under `dist/work/`, the newest album (from `src/generated/photos.json`),
  and `/quality`. It fails if any of them can't be resolved.

| Assertion | Budget |
|---|---|
| Performance | ≥ 0.95 (album pages ≥ 0.90) |
| Accessibility | = 1.0 |
| Best practices | ≥ 0.95 |
| SEO | ≥ 0.95 |
| Cumulative layout shift | ≤ 0.05 |
| Script bytes transferred | 0 on home, about, work and case-study pages; ≤ 15 KB compressed on album and quality pages |

- Running against the nginx container rather than `astro preview` measures real
  compression and headers.

### 8.8 Container tests — candidate image

The Playwright `container` project plus a Node helper using the Docker CLI. The
container starts the same way the deployment does: `--read-only`, `--tmpfs /tmp`,
`--cap-drop ALL`, `--security-opt no-new-privileges:true`.

- **Headers** on an HTML page, an `/_astro/*` asset, a `/photos/*` derivative and
  the 404 response:
  - `Content-Security-Policy` as in §10.2;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy`;
  - `Permissions-Policy`;
  - no nginx version in `Server`.

  Testing every response type catches nginx's `add_header` inheritance trap
  (§10.2).
- **Caching:** HTML is `no-cache`; `/_astro/*` and `/photos/*` are
  `public, max-age=31536000, immutable`; `/quality/summary.json` is `no-cache`.
- **Compression:** gzip on HTML, CSS and JS when the client sends
  `Accept-Encoding: gzip`.
- **Routing:**
  - `/work/<slug>` returns 200 with no redirect.
  - `/work/<slug>/` returns a 301 to the slashless URL.
  - An unknown path returns 404 with the custom page body.
- **Runtime:** the process UID isn't 0, the container reports healthy, and it runs
  correctly with a read-only root filesystem.

### 8.9 Release smoke — release image

- `/quality/summary.json` is served, validates against the schema, and its
  `build.number` equals `BUILD_NUMBER`.

### 8.10 Quality summary — `scripts/quality/summary.ts`

Writes `reports/quality/summary.json`, validated by `src/lib/quality-schema.ts`,
which both the script and the `/quality` renderer import:

```ts
{
  schemaVersion: 1,
  build: { number: string, commit: string, commitUrl: string, builtAt: string /* ISO */, ci: string },
  gates: Array<{
    id: 'unit' | 'e2e' | 'a11y' | 'smoke' | 'links' | 'privacy' | 'lighthouse' | 'container',
    label: string,
    status: 'passed' | 'failed' | 'missing',
    detail: Record<string, number | string | string[] | object>
    // e.g. e2e: { passed, failed, skipped, projects: [...] }
    //      lighthouse: { pages: [{ path, performance, accessibility, bestPractices, seo }] }
    //      privacy: { filesScanned, metadataFound }
  }>,
  content: { caseStudies: number, albums: number, photos: number, photosWithAlt: number }
}
```

- Exits non-zero unless **every** gate is `passed`. The release image can't be
  built from a failing run, so `/quality` always describes a passing run, and says
  so.
- `build` comes from Jenkins' standard `BUILD_NUMBER` and `GIT_COMMIT` variables.

---

## 9. CI contract (npm scripts)

Jenkins, or anything else, runs these in order. Each step exits non-zero on
failure.

| # | Script | Does | Env | Output |
|---|---|---|---|---|
| 1 | `npm ci` | install | | |
| 2 | `npm run lint` | §8.2 static checks | | |
| 3 | `npm run test:unit` | §8.2 | | `reports/junit/unit.xml` |
| 4 | `npm run build:fixtures` | photos + Astro in fixture mode | | `dist-fixtures/` |
| 5 | `npm run test:e2e` | §8.3 and §8.4 | | `reports/junit/e2e.xml`, `reports/playwright/` |
| 6 | `npm run build` | photos + Astro in real mode | `PHOTOS_DIR`, `PHOTOS_CACHE_DIR`, `BUILD_NUMBER`, `GIT_COMMIT` | `dist/` |
| 7 | `npm run image:candidate` | `docker build` → `hotdog-studio:<n>-candidate` | `BUILD_NUMBER` | image |
| 8 | `npm run test:prod` | starts the candidate on `:8088` (or uses `TARGET_URL`), runs §8.5–8.8, stops it | `TARGET_URL` (optional) | `reports/junit/*.xml`, `reports/a11y/`, `reports/lighthouse/`, `reports/links.json`, `reports/privacy.json` |
| 9 | `npm run quality:summary` | §8.10 | `BUILD_NUMBER`, `GIT_COMMIT` | `reports/quality/summary.json` |
| 10 | `npm run image:release` | `docker build -f docker/Dockerfile.release reports/quality` → `hotdog-studio:<n>` and `:latest` | `BUILD_NUMBER` | image |
| 11 | `npm run test:release` | §8.9 | `BUILD_NUMBER` | `reports/junit/release.xml` |

Also:

- `npm run dev`: photos (fixtures unless `PHOTOS_DIR` is set), then `astro dev`.
- `npm run verify`: runs steps 2–11 locally. Needs Docker. Uses fixture photos
  as `PHOTOS_DIR` if none is set, and prints a loud notice that it is doing so.
- `npm run test:visual:update`: regenerates the visual baselines inside the
  Playwright image.

**Execution environment:** run the Node stages inside
`mcr.microsoft.com/playwright:v<pinned>-noble`, which provides Node, the browsers
and their system dependencies. Steps 7, 8, 10 and 11 need Docker CLI access on the
agent.

**Notes for the future Jenkinsfile** (Thomas):

- The repo is public. **Never build pull requests from forks.** In GitHub Branch
  Source, set fork-PR trust to *Nobody*, or build only `main` and your own
  branches.
- Use SCM polling. Don't expose Jenkins for a GitHub webhook.
- Adding photos doesn't touch git. Allow manual builds and add a **nightly**
  build; the nightly run also catches external link rot.
- Publish `reports/junit/*.xml` with `junit`, publish the Playwright and
  Lighthouse HTML reports, and archive `reports/`.
- Deploy step: `IMAGE_TAG=<n> docker compose -f deploy/docker-compose.yml up -d`.

---

## 10. Deployment

### 10.1 Images

- `docker/Dockerfile` (candidate): `FROM nginxinc/nginx-unprivileged:<pinned>-alpine`.
  - Copies `dist/` to `/usr/share/nginx/html` and `docker/nginx/` to the nginx
    config directory.
  - Adds OCI labels `org.opencontainers.image.revision` and `.version` from build
    args.
  - `HEALTHCHECK` with `wget -q -O /dev/null http://127.0.0.1:8080/`.
  - `.dockerignore` is an **allowlist**: `*`, `!dist/**`, `!docker/nginx/**`.
    Photo originals, `.cache`, `fixtures` and the repo can never enter the image.
- `docker/Dockerfile.release`: `ARG CANDIDATE`, `FROM ${CANDIDATE}`, then
  `COPY summary.json /usr/share/nginx/html/quality/summary.json`. The build
  context is `reports/quality/` only. The release image is byte-identical to the
  tested candidate except for that one file.

### 10.2 `docker/nginx/default.conf`

- `listen 8080;` with `server_tokens off;`.
- Routing:
  - `try_files $uri $uri/index.html $uri.html =404;`
  - Trailing-slash URLs other than `/` get a 301 to the slashless form.
  - `error_page 404 /404.html;`
- Cache headers as in §8.8.
- gzip on for text types.
- Security headers live in **one snippet included in every `location`**, because
  an `add_header` inside a `location` silently drops the server-level ones:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://img.shields.io https://github.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

  All use `always`.
- Set Astro's `build.inlineStylesheets: 'never'` so `style-src 'self'` holds. If
  the pinned Astro version inlines any script, use its built-in CSP hashing
  support rather than `'unsafe-inline'`. The smoke and container gates catch
  violations either way.
- HSTS is set at Cloudflare, not here, because TLS terminates upstream.

### 10.3 `deploy/docker-compose.yml`

```yaml
services:
  hotdog-studio:
    image: hotdog-studio:${IMAGE_TAG:-latest}
    container_name: hotdog-studio
    restart: unless-stopped
    read_only: true
    tmpfs: [/tmp]
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    networks: [proxy]
networks:
  proxy:
    external: true
    name: ${PROXY_NETWORK:-npm_default}
```

No host ports are published; Nginx Proxy Manager reaches the container by name on
the shared network.

### 10.4 `deploy/README.md` (written by the implementer)

- **Nginx Proxy Manager:** a proxy host for `hotdog.studio` → `http://hotdog-studio:8080`,
  and `www.hotdog.studio` redirecting to the apex. Use a Let's Encrypt certificate
  via the Cloudflare DNS challenge, or a Cloudflare Origin certificate.
- **Cloudflare:** SSL mode Full (strict); HSTS enabled. No cache purge is needed on
  deploy, because assets and photos have hashed names and HTML isn't edge-cached
  by default.
- **Rollback:** `IMAGE_TAG=<previous> docker compose -f deploy/docker-compose.yml up -d`.
  Keep the last 5 release images.
- Finding the right `PROXY_NETWORK` name (`docker network ls`).

---

## 11. Error handling

| Situation | Behaviour |
|---|---|
| Invalid frontmatter or `album.yaml` | Build fails, naming the file and field |
| Collection rule broken (>3 featured, missing H2, prompt marker left in) | `lint` and build fail, naming the file |
| `PHOTOS_DIR` unset, missing or empty in real mode | Build exits 1 with instructions |
| Unsupported photo format | Build fails, listing every offending file |
| Photo with no alt text | Fallback alt, a build warning, and the count shown on `/quality` |
| Any gate fails | `quality:summary` exits non-zero; no release image; nothing deploys |
| Lightbox JS fails | Thumbnails still link to full-size images |
| `/quality/summary.json` missing or fetch fails | The empty state from §4.7 |
| Unknown URL | Custom 404 page with HTTP 404 |

---

## 12. Repository layout

```
hotdog-studio/
├── astro.config.mjs          # SITE_MODE handling, @site-config alias, sitemap, outDir
├── package.json
├── tsconfig.json
├── playwright.config.ts      # projects: functional ×5, visual, prod, container, release
├── vitest.config.ts
├── lighthouserc.cjs
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.release
│   └── nginx/default.conf (+ security-headers snippet)
├── .dockerignore             # allowlist
├── deploy/
│   ├── docker-compose.yml
│   └── README.md
├── src/
│   ├── site.config.ts
│   ├── content.config.ts     # collections; glob() base from SITE_MODE
│   ├── content/
│   │   ├── work/*.md
│   │   ├── other-projects.yaml
│   │   └── about.md
│   ├── generated/            # gitignored: photos.json
│   ├── lib/                  # photos-schema.ts, quality-schema.ts, shared helpers
│   ├── components/
│   ├── layouts/
│   ├── pages/                # index, about, 404, work/, photos/, quality
│   ├── scripts/              # client: lightbox.ts, quality.ts
│   └── styles/               # tokens.css, global.css
├── scripts/
│   ├── photos/process.ts
│   ├── content/check-case-studies.ts
│   ├── privacy-scan.ts
│   ├── quality/summary.ts
│   └── fixtures/make-photos.ts   # regenerates fixture images with fake EXIF
├── fixtures/
│   ├── site.config.ts
│   ├── content/              # 3 featured (one per source) + 1 extra + 1 draft; other-projects; about
│   ├── photos/               # album-newer (3 photos; one Orientation 6, one without alt),
│   │                         # album-older (2 photos, showExif: false), album-draft (draft: true)
│   └── quality/summary.json
├── tests/
│   ├── unit/
│   ├── e2e/                  # functional + visual (fixture build)
│   ├── prod/                 # a11y, smoke, links (real build)
│   ├── container/
│   └── support/              # fixtures, page objects
├── public/                   # favicon set, og-default.png, robots.txt, cv/
│   └── photos/               # gitignored: generated derivatives
└── reports/                  # gitignored
```

Fixture images are generated by `scripts/fixtures/make-photos.ts`: labelled
gradients written with sharp, carrying injected EXIF (Make, Model, GPS 0°N 0°E,
`BodySerialNumber: FIXTURE-SERIAL`, and Orientation 6 on one image). If sharp's
`withExif` can't write the GPS IFD, that script alone may use
`exiftool-vendored`. The generated files are **committed**, so tests don't depend
on regenerating them.

---

## 13. Related projects (separate specs and sessions)

1. **This site.**
2. **A public Reel Raffle test suite** in Cypress. E2E and API tests for
   reelraffle.org, run on every push and nightly, with published reports. It shows
   the product and the tests that guard it, without exposing Thomas's private
   framework. It needs a decision on running against production versus a staging
   or local instance.
3. **GitHub cleanup:**
   - PolynomialCalculator: purge `.exe`, `.pdb`, `.vs/` and build logs, and add a
     `.gitignore`. The binaries stay in history unless it is rewritten.
   - import-photos: add GitHub Actions CI running pytest with coverage, a badge,
     and a README section on the tests.
   - Optionally move TTD-JUnit to Maven or Gradle.
   - Pin the best repos and add a profile README.
4. **A sanitized public Cypress repo.** Fresh repo, fresh history, never a fork or
   branch of the private one. Run `gitleaks` before publishing. Then switch the
   `cypress-framework` case study to `source: sanitized`.
5. **Optionally, a C# or Java BDD demo repo** showing Thomas's professional pattern
   on a toy domain.

Thomas also writes the **Jenkinsfile** against §9.

---

## 14. Decisions to confirm

These were chosen during design without Thomas's explicit sign-off:

1. **Playwright** for this site's tests; Cypress is reserved for the Reel Raffle
   suite (§13, project 2).
2. The **header leads with "Thomas Southcott"**; hotdog.studio is the domain and
   icon. Recruiters search by name.
3. **Photo originals live in `PHOTOS_DIR` on the homelab**, never in git.
4. **Camera settings are shown under photos** from allowlisted EXIF, with a
   per-album opt-out.
5. **Uniform 3:2 cropped thumbnails**; the lightbox shows the full image.
6. The **fixture versus real build split**, and the **candidate versus release
   image** split.
7. **No analytics and no contact form.**
8. The public email is a **Cloudflare Email Routing alias** (e.g.
   `hello@hotdog.studio`) forwarding to Thomas's inbox, so his personal address
   isn't published.
9. **Light and dark follow the system setting only**, with no toggle.
10. **Lightbox deep-links** via the URL hash.
11. **British English** copy and `lang="en-GB"`.
12. **Drafts appear only in `npm run dev`.**
13. **Suggested featured trio:** import-photos, the Cypress framework, C++
    GoogleTest/protobuf.

## 15. Inputs needed from Thomas

- `tagline`, `pitch`, `jobTitle` and the `openToWork.message` text (role types,
  location or remote).
- LinkedIn URL and the public contact email.
- The CV as a PDF, public-safe (no home address or phone).
- `about.md` bio, plus an optional headshot.
- Prose for the seven case studies (scaffolded with prompts).
- The hotdog.studio icon exported as SVG or a 512px PNG. It exists as
  `img/icon/hotdogStudio.xcf` in the AutoStreamDeck repo. Without it the header
  uses a text wordmark.
- Photo exports in `PHOTOS_DIR` with an `album.yaml` per album, including alt
  text.
- The Jenkinsfile, and the `PROXY_NETWORK` name.

## 16. Suggested milestones

1. **M1 — Skeleton:** Astro, `SITE_MODE`, content collections, fixtures, the
   layout, home, work and case-study pages, lint, and unit tests.
   **Check in with Thomas on the visual direction before continuing.**
2. **M2 — Photos:** the pipeline, fixture images, photos pages and the lightbox,
   with their unit and e2e tests.
3. **M3 — Remaining pages:** about, 404, quality renderer, SEO and metadata.
4. **M4 — Gates:** full e2e and visual suites, privacy scan, quality summary.
5. **M5 — Container:** Dockerfiles, nginx config, container, a11y, smoke, links
   and Lighthouse gates against the candidate, the release image, `verify`, and
   `deploy/`.
6. **M6 — Content:** Thomas fills in §15. Remove `draft` from case studies as each
   is finished. First deploy fixes the 503.

## 17. Definition of done

- `npm run verify` passes locally from a clean clone, with Docker available.
- Every test listed in §8 exists and passes, and every scanning gate asserts a
  non-zero count.
- `docker/Dockerfile`, `docker/Dockerfile.release`, `deploy/docker-compose.yml`
  and `deploy/README.md` are complete enough for Thomas to deploy by following the
  README.
- The scaffolded case studies and the `src/site.config.ts` fields marked in §15
  are the only places waiting on Thomas's content.
