import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { aboutSchema, caseStudySchema, otherProjectSchema } from './lib/content-schemas';
import { modePaths, resolveSiteMode } from './lib/site-mode';
import { withPositionalIds } from './lib/yaml-list';

/** `src/content` for the real build, `fixtures/content` for the fixture build (`SITE_MODE`). */
const base = modePaths[resolveSiteMode(process.env.SITE_MODE)].contentDir;

/** Case studies. The entry id is the file name without `.md`, which is the URL slug. */
const work = defineCollection({
  loader: glob({ pattern: '*.md', base: `${base}/work` }),
  schema: ({ image }) => caseStudySchema(image()),
});

/** "Other things I build". `withPositionalIds` gives each entry the id the `file()` loader needs. */
const otherProjects = defineCollection({
  loader: file(`${base}/other-projects.yaml`, { parser: withPositionalIds }),
  schema: otherProjectSchema,
});

/** The bio. One entry, with the id `about`. */
const about = defineCollection({
  loader: glob({ pattern: 'about.md', base }),
  schema: ({ image }) => aboutSchema(image()),
});

export const collections = { work, otherProjects, about };
