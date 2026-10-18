import type { Locator, Page } from '@playwright/test';

/** A case-study page: the source block, and the section headings of the Markdown body. */
export class CaseStudyPage {
  readonly source: Locator;
  readonly sectionHeadings: Locator;
  readonly codeBlocks: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.source = page.getByRole('region', { name: 'Source', exact: true });
    // The body is the page's one article. A "## line" inside a code sample is text, not a heading.
    this.sectionHeadings = page.getByRole('article').getByRole('heading', { level: 2 });
    this.codeBlocks = page.getByRole('article').locator('pre');
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/work/${slug}`);
  }
}
