import { z } from 'astro/zod';

/** How a case study relates to its source code. It decides which other fields apply. */
export const SOURCES = ['public', 'sanitized', 'private'] as const;
export type Source = (typeof SOURCES)[number];

/**
 * The message for a link that is not http or https. The link fields use `z.httpUrl()` because
 * `z.url()` also accepts `javascript:` and `mailto:`.
 */
const WEB_URL_ERROR = 'Must be a web link starting with http:// or https://';

/** Text a person has to write. An empty string satisfies `z.string()` but says nothing. */
const nonEmpty = () => z.string().min(1, { error: 'Must not be empty' });

/** The hosts a badge image may come from. */
const BADGE_HOSTS: ReadonlySet<string> = new Set(['img.shields.io', 'github.com']);

/**
 * True for an https URL on a badge host. The host is compared whole, so lookalikes such as
 * `img.shields.io.evil.example` and `img.shields.io@evil.example` fail.
 *
 * Total on purpose: a string that does not parse is `false`, never a thrown `TypeError`. Zod runs
 * a refinement even after the URL check has failed, and a throw there would crash the build.
 */
function isBadgeImageUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && BADGE_HOSTS.has(hostname);
}

export const badgeSchema = z.object({
  label: nonEmpty(),
  src: z.httpUrl({ error: WEB_URL_ERROR }).refine(isBadgeImageUrl, {
    error: 'Badge images must be https links on img.shields.io or github.com',
    // Skip the host check once the URL check has failed, so a malformed `src` is reported once.
    when: ({ issues }) => issues.length === 0,
  }),
  href: z.httpUrl({ error: WEB_URL_ERROR }),
});
export type Badge = z.output<typeof badgeSchema>;

/**
 * Frontmatter of a case study (spec §5.2). `cover` is the schema for the optional cover image:
 * Astro's `image()` in the content collection, a plain string in tests.
 *
 * The cross-field rules are issues on the field that needs fixing, so a build error names it.
 */
export function caseStudySchema<C extends z.ZodType>(cover: C) {
  return z
    .object({
      title: nonEmpty(),
      summary: nonEmpty().max(160),
      source: z.enum(SOURCES),
      repo: z.httpUrl({ error: WEB_URL_ERROR }).optional(),
      privateNote: nonEmpty().optional(),
      liveUrl: z.httpUrl({ error: WEB_URL_ERROR }).optional(),
      stack: z.array(nonEmpty()).min(1),
      role: nonEmpty().optional(),
      period: nonEmpty().optional(),
      featured: z.boolean().default(false),
      featuredOrder: z.int().optional(),
      order: z.int().optional(),
      badges: z.array(badgeSchema).optional(),
      cover: cover.optional(),
      draft: z.boolean().default(false),
    })
    .superRefine((study, ctx) => {
      const report = (field: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: [field], message });
      const isPrivate = study.source === 'private';
      const isSanitized = study.source === 'sanitized';

      if (!isPrivate && study.repo === undefined) {
        report('repo', 'repo is required when source is "public" or "sanitized"');
      }
      if (isPrivate && study.repo !== undefined) {
        report('repo', 'repo must be absent when source is "private"');
      }
      if (isSanitized && study.privateNote === undefined) {
        report('privateNote', 'privateNote is required when source is "sanitized"');
      }
      if (!isSanitized && study.privateNote !== undefined) {
        report('privateNote', 'privateNote is only allowed when source is "sanitized"');
      }
      if (study.featured && study.featuredOrder === undefined) {
        report('featuredOrder', 'featuredOrder is required when featured is true');
      }
      if (isPrivate && study.badges !== undefined) {
        report('badges', 'badges are only allowed when source is "public" or "sanitized"');
      }
    });
}

export const otherProjectSchema = z.object({
  name: nonEmpty(),
  description: nonEmpty(),
  repo: z.httpUrl({ error: WEB_URL_ERROR }),
});
export type OtherProject = z.output<typeof otherProjectSchema>;

/** Frontmatter of the about page (spec §5.4). `headshot` is the schema for the optional image. */
export function aboutSchema<C extends z.ZodType>(headshot: C) {
  return z.object({ headshot: headshot.optional() });
}
