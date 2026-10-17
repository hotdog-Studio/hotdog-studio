# M1 follow-ups: deferred items and carry-forward notes

M1 (Skeleton) was built on branch `m1-skeleton` from the plan `docs/superpowers/plans/2026-10-17-m1-skeleton.md`. Every task passed a spec and quality review, and a final whole-branch review followed. This note records what those reviews deliberately left for later, so the M2–M5 plans and the M6 content work can pick it up. It adds to the plan's own "Carry-forward notes" section.

## Decide at the M1 visual check-in (Thomas)

- **Mobile gutter.** Spec §7 says "16px side gutters on mobile". The gutter is 16px at 320px but grows to about 19.5px at 390px and 21.5px at 430px (`clamp(var(--gutter), 5vw, 4rem)`). Decide before M4 records the visual baselines. A fix that keeps 16px across the phone range: `clamp(var(--gutter), 8vw - 2rem, 4rem)` in one shared `--frame-gutter`.
- **Duplicate `featuredOrder`** is checked among featured studies only. §5.2 says "featuredOrder values are unique". This is a deliberate narrowing: the order only matters while a study is featured.
- **One or two featured studies** stretch across the full width on `/` and `/work`, because `auto-fit` collapses the empty tracks. The fixture build always has three, so it never shows this.
- **Visual taste:**
  - mustard `::selection`;
  - the filled mustard "See my work" button;
  - whole-card links;
  - Prism colours for function, class-name, operator and punctuation tokens, which the plan left unspecified;
  - code that wraps with `overflow-wrap: anywhere` and can split identifiers at 320px.
- **Two repository links on a case study** ("Repository" in the header and "View the repository" in the source block), both mandated by §4.4. A badge link is named only by its label.
- **Real-mode `/work`** shows no empty-state copy while every study is a draft.

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
