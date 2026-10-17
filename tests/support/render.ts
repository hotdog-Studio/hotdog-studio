import { experimental_AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { parseHTML } from 'linkedom';

/**
 * Renders an Astro component with the Container API and parses the HTML, so a test can query the
 * result like a page. The container renders a fragment, so it is wrapped in a document first.
 */
export async function renderHtml(
  Component: AstroComponentFactory,
  props: Record<string, unknown> = {},
): Promise<Document> {
  const container = await experimental_AstroContainer.create();
  const html = await container.renderToString(Component, { props });
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}
