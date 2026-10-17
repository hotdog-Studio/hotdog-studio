import { getCollection, type CollectionEntry } from 'astro:content';
import { isVisible } from './work';

/** The case studies this build shows. Drafts are included only under `astro dev`. */
export function getVisibleCaseStudies(): Promise<CollectionEntry<'work'>[]> {
  return getCollection('work', ({ data }) => isVisible(data.draft, import.meta.env.DEV));
}
