import type { Source } from './content-schemas';

/**
 * What these helpers read from a case study. A `CollectionEntry<'work'>` fits, and the generic
 * helpers hand back the entry type they were given, so a page keeps every other field.
 */
export type StudyLike = {
  id: string;
  data: {
    title: string;
    featured: boolean;
    featuredOrder?: number | undefined;
    order?: number | undefined;
  };
};

/** Drafts appear only under `astro dev` (spec §3.1). Every build leaves them out. */
export function isVisible(draft: boolean, isDev: boolean): boolean {
  return !draft || isDev;
}

/** The home page features at most this many studies (spec §4.2). */
const MAX_FEATURED = 3;

/** Ascending, with a missing number after every present one. */
function compareMissingLast(a: number | undefined, b: number | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

const byTitle = (a: StudyLike, b: StudyLike): number =>
  a.data.title.localeCompare(b.data.title, 'en-GB');

// Both orderings fall back to the title. It breaks ties and orders the studies with no number.
const byFeaturedOrder = (a: StudyLike, b: StudyLike): number =>
  compareMissingLast(a.data.featuredOrder, b.data.featuredOrder) || byTitle(a, b);

const byOrder = (a: StudyLike, b: StudyLike): number =>
  compareMissingLast(a.data.order, b.data.order) || byTitle(a, b);

/**
 * The studies the home page features (spec §4.2): those marked `featured`, by `featuredOrder`,
 * and no more than three.
 */
export function selectFeatured<T extends StudyLike>(studies: readonly T[]): T[] {
  return studies
    .filter((study) => study.data.featured)
    .toSorted(byFeaturedOrder)
    .slice(0, MAX_FEATURED);
}

/**
 * The order of the `/work` list (spec §4.3): featured studies first, by `featuredOrder`, then the
 * rest by `order` ascending, with the studies that have no `order` after every numbered one. Ties
 * go by title. Unlike `selectFeatured`, it keeps every study.
 */
export function sortForIndex<T extends StudyLike>(studies: readonly T[]): T[] {
  return studies.toSorted((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return a.data.featured ? byFeaturedOrder(a, b) : byOrder(a, b);
  });
}

const SOURCE_LABELS = {
  public: 'Public',
  sanitized: 'Public edition',
  private: 'Private',
} as const satisfies Record<Source, string>;

/** The badge text for how a case study relates to its source code. */
export function sourceLabel(source: Source): 'Public' | 'Public edition' | 'Private' {
  return SOURCE_LABELS[source];
}

/** The path of a case study's page. */
export function caseStudyHref(id: string): string {
  return `/work/${id}`;
}

/** The id of the Reel Raffle case study, which is also its slug in the URL. */
export const REEL_RAFFLE_SLUG = 'reel-raffle';

/**
 * Where the Reel Raffle card links to inside the site (spec §4.2): the case study when it is among
 * `studies`, otherwise `undefined`, so the link never points at a draft or a missing page. Pass the
 * studies the build shows.
 */
export function reelRaffleCaseStudyHref(studies: readonly StudyLike[]): string | undefined {
  return studies.some((study) => study.id === REEL_RAFFLE_SLUG)
    ? caseStudyHref(REEL_RAFFLE_SLUG)
    : undefined;
}
