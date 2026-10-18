import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { focusablePre } from '../../src/lib/focusable-pre';

async function render(markdown: string): Promise<string> {
  const processor = await createSatteriMarkdownProcessor({
    syntaxHighlight: 'prism',
    hastPlugins: [focusablePre],
  });
  return (await processor.render(markdown)).code;
}

describe('focusablePre', () => {
  it('makes a highlighted block keyboard-focusable', async () => {
    expect(await render('```ts\nconst a = 1;\n```')).toMatch(
      /<pre class="language-ts"[^>]* tabindex="0">/,
    );
  });

  it('makes a block with no language keyboard-focusable', async () => {
    expect(await render('```\nplain\n```')).toMatch(/<pre[^>]* tabindex="0">/);
  });

  it('leaves inline code alone', async () => {
    expect(await render('Some `inline` code.')).not.toContain('tabindex');
  });
});
