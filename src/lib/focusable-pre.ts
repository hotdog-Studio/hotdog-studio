import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type FocusablePrePlugin = NonNullable<SatteriProcessorOptions['hastPlugins']>[number];

/**
 * Makes every code block keyboard-focusable. Long lines scroll inside the block rather than
 * wrapping, and a scrollable region must be reachable without a mouse (axe's
 * scrollable-region-focusable). Sätteri runs user hast plugins after Prism, so this sees the
 * `<pre>` that Prism produces.
 */
export const focusablePre = {
  name: 'focusable-pre',
  element: {
    filter: ['pre'],
    visit(node, ctx) {
      ctx.setProperty(node, 'tabIndex', 0);
    },
  },
} satisfies FocusablePrePlugin;
