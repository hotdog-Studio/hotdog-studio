/** The main navigation (spec §4.1), in display order. */
export const NAV_ITEMS = [
  { label: 'Work', href: '/work' },
  { label: 'Photos', href: '/photos' },
  { label: 'About', href: '/about' },
] as const;

/**
 * Whether `href` is the section `pathname` is in, which the header marks with
 * `aria-current="page"`. `/` matches only the home page. Any other `href` matches its own page and
 * every page under it, so Work stays current on a case study. One trailing slash is ignored.
 */
export function isCurrent(pathname: string, href: string): boolean {
  const path = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (href === '/') return path === '/';
  return path === href || path.startsWith(`${href}/`);
}
