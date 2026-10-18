# M1 follow-ups: deferred items and carry-forward notes

M1 (Skeleton) was built on branch `m1-skeleton` from the plan `docs/superpowers/plans/2026-10-17-m1-skeleton.md`. Every task passed a spec and quality review, and a final whole-branch review followed. This note records what those reviews deliberately left for later, so the M2–M5 plans and the M6 content work can pick it up. It adds to the plan's own "Carry-forward notes" section.

## M1 visual check-in (Thomas, 2026-10-18)

Thomas reviewed the fixture build (`/`, `/work` and the three case-study source labels, at 320, 390 and 1280px in both themes). He approved the visual direction, with the changes below, and asked to discuss something before M2 is planned.

### Changes to make, in the M2 CSS pass and before M4 records the visual baselines

- **Mobile gutter: fix it at 16px across the phone range,** as spec §7 says. It currently grows to about 19.5px at 390px and 21.5px at 430px (`clamp(var(--gutter), 5vw, 4rem)`). Use `clamp(var(--gutter), 8vw - 2rem, 4rem)` in one shared `--frame-gutter`.
- **"See my work" gets a neutral fill:** solid `--color-text` with `--color-bg` text, in place of the mustard fill. That keeps mustard for links, focus rings and badges, as §7 describes. "Download CV" and "Email me" stay outlined.
- **Code blocks scroll sideways instead of wrapping.** Drop `overflow-wrap: anywhere` and `white-space: pre-wrap` from `pre`, and give it `overflow-x: auto`, so identifiers stay whole. The page itself must still never scroll sideways at 320px. Because the block now scrolls, every `<pre>` needs `tabindex="0"` (axe `scrollable-region-focusable`). Prism doesn't add it, so a small rehype plugin must. Assert it in a test, and rewrite the "wrap rather than scroll" comment in `prism.css`.
- **`::selection` becomes a soft mustard tint:** a pale mustard background, with the text keeping its own colour. Check the text's contrast on the tint in both themes.
- **Quieter code palette: mustard and greys only.**
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

- **One CSS consolidation pass alongside the album grid.** It must land before M6, because one or two featured studies is a likely real state.
  - Move to a single shared card grid: use `auto-fill` to remove the one-or-two-card stretch and keep the "Other things I build" strip aligned. `.sections`, the heading gap and the grid are currently repeated across `index.astro`, `work/index.astro` and `OtherProjects.astro`.
  - Share one panel recipe (border, radius, surface), currently repeated in SourceBlock, prism.css, CaseStudyCard and ReelRaffleCard. The focus-ring and radius values are also repeated, and the list reset appears in both SiteHeader and SiteFooter.
  - Fix the wrong 24px-target comment at `OtherProjects.astro:48`.
  - Put the tokens and global rules in `@layer base`. The global stylesheet currently loads after component CSS and wins only through scoping specificity.
- `src/generated/photos.json` is git-ignored, but §9 runs `lint` (`astro check`) and the unit tests before any build. Don't import it statically from type-checked code, or generate it first.
- Add browser globals to ESLint for `src/scripts/**`.
- **Script inlining** (from the plan's carry-forward): set `vite.build.assetsInlineLimit` so the lightbox script is never inlined, and assert that there is no inline `<script>`.
- **Dominant-colour placeholders** (from the plan's carry-forward): use a generated stylesheet, not `style` attributes.
- Make the console guard include the source URL (`message.location().url`), so "Failed to load resource" names the asset.
- Fix the `astro.config.ts` cacheDir comment: the content store lives in cacheDir for `build` and `check` only, while `astro dev` uses `.astro/`.

## M3 (about, 404, quality, SEO)

- **BaseLayout tests:** title composition, the meta description (case studies use `summary`, §4.10), `lang`, and `main#main`. Fold these into the SEO work.
- **Wide Markdown tables** (GFM is on) scroll the page sideways at 320px. Add a `.prose` table wrapper or overflow rule before real studies are published.
- Give the web-URL error message and the non-empty-string helper one shared home. Today they are duplicated across content-schemas.ts and site-config-schema.ts.
- **Console-guard opt-out** (an option fixture), needed for the §8.3 `/quality` test that intercepts a 404.
- Extend the scaffold checks to the prompt in `src/content/about.md` and the `TODO(thomas)` in `src/content/other-projects.yaml`.
- Copying `fixtures/quality/summary.json` only in fixtures mode needs a build hook or a per-mode `publicDir`.
- `Astro.site` inside `getStaticPaths` is deprecated; use `import.meta.env.SITE`.
- Add a fixture diagram, and assert that Markdown images carry no `style` attribute.

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

## M6 (content), for Thomas

- Supply the inputs in §15, including `public/cv/thomas-southcott-cv.pdf` (the "Download CV" link points there), the real LinkedIn URL, and the Elden-Ring-Fullscreen-Map one-liner.
- When a study leaves draft, the checker and build fail on leftover `<!-- prompt: … -->` markers, `TODO(thomas)` placeholders and misspelt frontmatter keys.
- If a study uses `h4` headings, add `.prose` spacing for them.
