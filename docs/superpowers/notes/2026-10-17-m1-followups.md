# M1 follow-ups: deferred items and carry-forward notes

M1 (Skeleton) was built on branch `m1-skeleton` from the plan `docs/superpowers/plans/2026-10-17-m1-skeleton.md`. Every task passed a spec and quality review, and a final whole-branch review followed. This note records what those reviews deliberately left for later, so the M2–M5 plans and the M6 content work can pick it up. It adds to the plan's own "Carry-forward notes" section. The note now also records the M1 check-in decisions, what M2 completed, and the carry-forward notes for M3 to M6.

## M1 visual check-in (Thomas, 2026-10-18)

Thomas reviewed the fixture build (`/`, `/work` and the three case-study source labels, at 320, 390 and 1280px in both themes). He approved the visual direction, with the changes below, and asked to discuss something before M2 is planned.

### Changes to make, in the M2 CSS pass and before M4 records the visual baselines

- **Done in M2 (Task 1): fix the mobile gutter at 16px across the phone range,** as spec §7 says. It currently grows to about 19.5px at 390px and 21.5px at 430px (`clamp(var(--gutter), 5vw, 4rem)`). Use `clamp(var(--gutter), 8vw - 2rem, 4rem)` in one shared `--frame-gutter`.
- **Done in M2 (Task 2): "See my work" gets a neutral fill:** solid `--color-text` with `--color-bg` text, in place of the mustard fill. That keeps mustard for links, focus rings and badges, as §7 describes. "Download CV" and "Email me" stay outlined.
- **Done in M2 (Task 2): code blocks scroll sideways instead of wrapping.** Drop `overflow-wrap: anywhere` and `white-space: pre-wrap` from `pre`, and give it `overflow-x: auto`, so identifiers stay whole. The page itself must still never scroll sideways at 320px. Because the block now scrolls, every `<pre>` needs `tabindex="0"` (axe `scrollable-region-focusable`). Prism doesn't add it, so a small rehype plugin must. Assert it in a test, and rewrite the "wrap rather than scroll" comment in `prism.css`.
- **Done in M2 (Task 2): `::selection` becomes a soft mustard tint:** a pale mustard background, with the text keeping its own colour. Check the text's contrast on the tint in both themes.
- **Done in M2 (Task 2): quieter code palette, mustard and greys only.**
  - Keywords stay mustard.
  - Strings, numbers, built-ins, class names and functions use the text colour.
  - Operators and punctuation use the muted grey.
  - Comments stay muted italic.
  - Drop the green and blue `--code-*` values. With fewer colours, distinguish tokens by weight or style only if a sample reads badly.

### Kept as built

- **Both repository links on a case study** ("Repository" in the header and "View the repository" in the source block), as §4.4 mandates.
- **Whole-card links.**
- **One or two featured studies** stretch across the full width, because `auto-fit` collapses the empty tracks. The M2 grid consolidation below already fixes this.

### Not raised at the check-in; the built behaviour stands

- **Duplicate `featuredOrder`** is checked among featured studies only, though §5.2 says "featuredOrder values are unique". This is a deliberate narrowing: the order only matters while a study is featured.
- **Real-mode `/work`** shows no empty-state copy while every study is a draft. The first deploy is in M6, after studies are published.

### Noticed while preparing the check-in

- `astro preview` returns 404 for slashed URLs such as `/work/`, because of `trailingSlash: 'never'` (§4.10). The M5 nginx config must 301 them to the slashless form (§10.2), and a container test should cover it.

## M2 (photos)

- **Done in M2 (Task 1): one CSS consolidation pass alongside the album grid.** It must land before M6, because one or two featured studies is a likely real state.
  - Move to a single shared card grid: use `auto-fill` to remove the one-or-two-card stretch and keep the "Other things I build" strip aligned. `.sections`, the heading gap and the grid are currently repeated across `index.astro`, `work/index.astro` and `OtherProjects.astro`.
  - Share one panel recipe (border, radius, surface), currently repeated in SourceBlock, prism.css, CaseStudyCard and ReelRaffleCard. The focus-ring and radius values are also repeated, and the list reset appears in both SiteHeader and SiteFooter.
  - Fix the wrong 24px-target comment at `OtherProjects.astro:48`.
  - Put the tokens and global rules in `@layer base`. The global stylesheet currently loads after component CSS and wins only through scoping specificity.
- **Done in M2 (Task 9):** `src/generated/photos.json` is git-ignored, but §9 runs `lint` (`astro check`) and the unit tests before any build. Don't import it statically from type-checked code, or generate it first.
- **Done in M2 (Task 11):** add browser globals to ESLint for `src/scripts/**`.
- **Done in M2 (Task 11):** script inlining, from the plan's carry-forward. Set `vite.build.assetsInlineLimit` so the lightbox script is never inlined, and assert that there is no inline `<script>`.
- **Done in M2 (Tasks 8 and 9):** dominant-colour placeholders, from the plan's carry-forward. Use a generated stylesheet, not `style` attributes.
- **Done in M2 (Task 10):** make the console guard include the source URL (`message.location().url`), so "Failed to load resource" names the asset.
- **Done in M2 (Task 2):** fix the `astro.config.ts` cacheDir comment: the content store lives in cacheDir for `build` and `check` only, while `astro dev` uses `.astro/`.

## M2 carry-forward notes for M3–M5

- **Re-encoded photos keep their URLs (M5).** Derivative names are `<id>-<width>`, where the id hashes the original. Bumping `PIPELINE_VERSION` re-encodes the derivatives under the same URLs. Under §8.8's `immutable`, one-year cache on `/photos/*`, visitors would keep the old bytes for a year. Before the first deploy, either put the pipeline version in the path, such as `/photos/v1/<album>/…`, or accept that a re-encode needs a cache purge.
- **The real build needs `PHOTOS_DIR` (M5).** `npm run verify` must fall back to `fixtures/photos` with a loud notice (§9). Until Thomas has exports, run the real build locally with `$env:PHOTOS_DIR = 'fixtures/photos'`.
- **URL layout versus the caching rule (M5, final review).** Album pages are built at `dist/photos/<slug>/index.html`, in the same folder as the `<id>-<w>.avif|webp` derivatives. §8.8 gives `/photos/*` `public, max-age=31536000, immutable` and HTML `no-cache`, so a literal `location /photos/` would cache album pages in browsers for a year. In M5, match the derivatives by extension (`location ~* ^/photos/.+\.(avif|webp)$`), or move them under their own prefix. This is separate from the "re-encoded photos keep their URLs" note above.
- **Lighthouse (M5).** Album pages must keep script bytes at or under 15 KB, and the newest album page comes from `src/generated/photos.json` (§8.7).
- **Accessibility (M5).** The axe gate's lightbox-open state (§8.5) should open the first photo of the newest album, by clicking it or with its `#id`.
- **Privacy gate (M4).** `scripts/privacy-scan.ts` can reuse the metadata assertion from `photo-derive.test.ts`.
- **Visual baselines (M4)** should include the lightbox open on `album-newer`.
- **SEO (M3).** An album's `og:image` is its cover's largest WebP.
- **Quality summary (M4).** `photosWithAlt` comes from the count of photos where `altIsFallback` is false.
- **iOS Safari (Thomas, before M6):** check the full-height lightbox on a real iPhone with Safari's dynamic toolbar. It passes in the iPhone 14 emulation only.
- **Lightbox announcements (M5 a11y):** the counter is a polite live region, so screen readers hear "2 / 3" (often read as "2 slash 3"), but not the photo's alt text or caption. Consider announcing "<alt>, photo 2 of 3".
- **Lightbox hash timing:** the hash follows a move after a 250 ms pause, which keeps WebKit's history rate limit at bay. Opening and closing update it at once. A copied URL within 250 ms of a move points at the previous photo.

## M3 (about, 404, quality, SEO)

- **BaseLayout tests:** title composition, the meta description (case studies use `summary`, §4.10), `lang`, and `main#main`. Fold these into the SEO work.
- **Wide Markdown tables** (GFM is on) scroll the page sideways at 320px. Add a `.prose` table wrapper or overflow rule before real studies are published.
- Give the web-URL error message and the non-empty-string helper one shared home. Today they are duplicated across content-schemas.ts and site-config-schema.ts.
- **Console-guard opt-out** (an option fixture), needed for the §8.3 `/quality` test that intercepts a 404.
- Extend the scaffold checks to the prompt in `src/content/about.md` and the `TODO(thomas)` in `src/content/other-projects.yaml`.
- Copying `fixtures/quality/summary.json` only in fixtures mode needs a build hook or a per-mode `publicDir`.
- `Astro.site` inside `getStaticPaths` is deprecated; use `import.meta.env.SITE`.
- Add a fixture diagram, and assert that Markdown images carry no `style` attribute.
- **Aligned GFM tables carry an inline style (M3, final review).** Sätteri renders `|:--|--:|` as `<th style="text-align: left">`, and `style-src 'self'` blocks it. Right-aligned number columns are likely in the "Results" sections. Fix it with a hast plugin, like `src/lib/focusable-pre.ts`, that turns the style into an `align-left`, `align-center` or `align-right` class. Add an aligned table to a fixture study so the existing `[style]` e2e check covers it.

## M4 / M5 (gates, container)

- **Playwright config:** one `playwright.config.ts` with a global `webServer` and a single JUnit path won't fit the prod, container and release projects. Use separate config files, or start the `webServer` conditionally.
- **`offlineRouting` treats only `localhost` as local.** Compare against `baseURL`'s origin, so a `TARGET_URL` on `127.0.0.1` or a container host works.
- **Placeholder gate:** add a release check that fails on `TODO(thomas)` or `linkedin.com/in/TODO`. The links gate skips linkedin.com by design.
- Guard self-tests: use `test.fail()` specs for `consoleGuard` and `offlineRouting`. Document the known limit that an external request fired as a test's very last action can be missed.
- Guard `page.unrouteAll` in the `offlineRouting` teardown with `if (!page.isClosed())`.
- Use `expect.poll` for the skip-link bounding-box read (`layout.spec.ts`).
- Make the hero page-object locator independent of the fixture name.
- Move the `linkWithText` test helper into `tests/support/`; it is copied in three component tests.
- Check that the Playwright Docker image's Node is at least 24.16, because `engine-strict` is on. Decide on npm's esbuild `allowScripts` notice when the CI image is set up.
- **Code-token contrast:** confirm axe covers a real page with a code block, or add a unit test that parses `tokens.css`.
- Keep `--ignore-lock` wherever a harness starts `astro preview`.

## Deferred from the M2 reviews

- **Warm builds (before M6).** Every original is read twice and fully decoded once, even when every derivative is cached (`scripts/photos/pipeline.ts`, `scripts/photos/derive.ts`). On a NAS share, every `npm run dev` start can take minutes. Skip the second read when every `<id>-<w>.<ext>` for `widthLadder(width)` is cached, and optionally cache `describeImage` and the EXIF per id.
- **Unicode filenames (before M6).** Matching `album.yaml` keys and `cover` to filenames doesn't normalise Unicode, so a name stored in NFD (as macOS writes it) won't match a key typed in NFC. Use `.normalize('NFC')` before `.toLowerCase()`.
- **Drafts, defence in depth (M5).** A dev run leaves drafts in `public/photos` and `src/generated/photos.json`, and only the npm `&&` chain stops a bare `astro build` from publishing them. Option: `--dev` writes a marker file that `loadPhotoManifest` refuses in a production build.
- **Lightbox sizes (M5, performance).** `sizes="100vw"` makes a portrait photo on a wide desktop fetch the largest rendition. Use a size based on the aspect ratio.
- **Cache housekeeping.** Old `v<N>` folders in `PHOTOS_CACHE_DIR` are never pruned.
- **README.** Add a sentence saying symlinked folders inside an album are reported as unsupported files.
- **Unrecognised system files.** `ehthumbs.db` and macOS `Icon` files fail as unsupported, because they aren't on the ignore list. Add them if Thomas's share has them.
- **Tests (M4).** Add a clock-based test (Playwright's `page.clock`) proving that closing the lightbox cancels a pending hash write. Assert `aria-atomic` on the counter.
- **Accessibility (M5).** Consider `aria-haspopup="dialog"` on the album thumbnails. Holding Enter on a thumbnail may cycle the lightbox open and closed with history writes, which only leaves a stale hash. The counter announces "2 / 3" but not the alt text (already noted).

## M6 (content), for Thomas

- Supply the inputs in §15, including `public/cv/thomas-southcott-cv.pdf` (the "Download CV" link points there), the real LinkedIn URL, and the Elden-Ring-Fullscreen-Map one-liner.
- When a study leaves draft, the checker and build fail on leftover `<!-- prompt: … -->` markers, `TODO(thomas)` placeholders and misspelt frontmatter keys.
- If a study uses `h4` headings, add `.prose` spacing for them.
