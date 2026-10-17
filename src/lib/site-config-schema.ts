import { z } from 'astro/zod';

/**
 * The message for a link that is not http or https. The link fields use `z.httpUrl()` because
 * `z.url()` also accepts `javascript:` and `mailto:`.
 */
const WEB_URL_ERROR = 'Must be a web link starting with http:// or https://';

/** The site config (spec §5.1). */
export const siteConfigSchema = z.object({
  name: z.string().min(1),
  jobTitle: z.string().min(1),
  tagline: z.string().min(1),
  pitch: z.string().min(1),
  email: z.email(),
  links: z.object({
    github: z.httpUrl({ error: WEB_URL_ERROR }),
    linkedin: z.httpUrl({ error: WEB_URL_ERROR }),
    reelRaffle: z.httpUrl({ error: WEB_URL_ERROR }),
  }),
  cv: z
    .string()
    .startsWith('/', { error: 'Must start with "/", such as /cv/thomas-southcott.pdf' }),
  openToWork: z
    .object({ enabled: z.boolean(), message: z.string() })
    .superRefine((openToWork, ctx) => {
      if (openToWork.enabled && openToWork.message.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['message'],
          message: 'message must not be empty while openToWork is enabled',
        });
      }
    }),
});
export type SiteConfig = z.output<typeof siteConfigSchema>;

/** Validates a site config when the build starts, and throws a readable error if it is wrong. */
export function defineSiteConfig(config: z.input<typeof siteConfigSchema>): SiteConfig {
  const result = siteConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error('Invalid site config:\n' + z.prettifyError(result.error));
  }
  return result.data;
}
