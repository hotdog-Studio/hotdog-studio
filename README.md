# hotdog.studio

The source of [hotdog.studio](https://hotdog.studio), Thomas Southcott's portfolio. It is a static [Astro](https://astro.build) site of case studies, photography albums and a public quality report, built to be evidence for its own message: the repository carries a real test suite and quality gates. The design is in the [design spec](docs/superpowers/specs/2026-10-14-hotdog-studio-portfolio-design.md).

## Prerequisites

- Node 24.22, the version pinned in `.node-version`. The minimum is 24.16, because `eslint-plugin-astro` and `astro-eslint-parser` need it. `.npmrc` sets `engine-strict=true`, so `npm ci` and `npm install` refuse to run on anything older, rather than installing a lint toolchain on a Node it does not support.
- Install the dependencies with `npm ci`.
- Install the Playwright browsers once with `npx playwright install chromium firefox webkit`. Linux CI agents add `--with-deps`. Only `npm run test:e2e` needs them.

## Build modes

`SITE_MODE` selects what a build reads and where it writes. `real` is the default, and an unset or empty value means the same. It builds into `dist/`. `fixtures` builds into `dist-fixtures/`, so it never overwrites the real build. Any other value fails the build rather than silently falling back to the real site.

## Scripts

| Script                     | What it does                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Starts the Astro dev server on <http://localhost:4321> in real mode. Drafts show here and nowhere else. |
| `npm run build`            | Runs `npm run check:content`, then builds the real site into `dist/`. Drafts are left out.              |
| `npm run build:fixtures`   | Runs the same build with `SITE_MODE=fixtures`, reading `fixtures/` and writing `dist-fixtures/`.        |
| `npm run preview:fixtures` | Serves `dist-fixtures/` on <http://localhost:4321>. Build it first.                                     |
| `npm run lint`             | Runs `astro check`, ESLint (no warnings allowed) and Prettier's check, then checks the case studies.    |
| `npm run format`           | Rewrites every file with Prettier.                                                                      |
| `npm run test:unit`        | Runs the Vitest unit and component tests and writes a JUnit report to `reports/junit/unit.xml`.         |
| `npm run test:e2e`         | Runs the Playwright suite against the fixture build and writes `reports/junit/e2e.xml`.                 |
| `npm run check:content`    | Checks the current mode's case studies against the content rules and fails on any error.                |

## CI order

CI runs these steps in order, and each exits non-zero on failure. They are steps 1 to 6 of the CI contract in section 9 of the design spec. The contract's later steps (container images, tests against the running site and the quality report) are not built yet.

1. `npm ci` installs the locked dependencies.
2. `npm run lint` runs the static checks.
3. `npm run test:unit` runs the unit tests.
4. `npm run build:fixtures` builds the fixture site.
5. `npm run test:e2e` tests that fixture build in the browser.
6. `npm run build` builds the real site.

Step 5 serves what step 4 built, so keep that order.

## Viewing the site

- **Fixture build.** Run `npm run build:fixtures`, then `npm run preview:fixtures`, and open <http://localhost:4321>. It uses made-up case studies that cover every source label, so the site looks complete without any real content.
- **Real content, drafts included.** Run `npm run dev`, which uses real mode. A case study marked `draft: true` in its front matter shows under `npm run dev` and nowhere else, because `npm run build` and `npm run build:fixtures` both leave drafts out.

`astro dev` keeps its content store in `.astro/`, which every mode shares, so switching `SITE_MODE` between dev sessions can print a harmless duplicate-slug warning.

## End-to-end tests

The Playwright suite tests the fixture build, never the real site or the dev server. It runs in five projects: Chromium, Firefox and WebKit on the desktop, plus Pixel 7 and iPhone 14 emulation.

1. Build the fixtures with `npm run build:fixtures`. The suite serves whatever is in `dist-fixtures/`, so run this first, and again after any change to the site.
2. Run the suite with `npm run test:e2e`. Playwright starts and stops its own preview server on port 4321. It never reuses a running one, so stop `npm run dev` or `npm run preview:fixtures` first, or the run fails straight away.

The HTML report goes to `reports/playwright` and the JUnit report to `reports/junit/e2e.xml`.
