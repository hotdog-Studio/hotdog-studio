import { describe, expect, it } from 'vitest';
import OpenToWorkBanner from '../../../src/components/OpenToWorkBanner.astro';
import { renderHtml } from '../../support/render';

const message = 'Open to QA automation roles in Leeds or remote.';

describe('OpenToWorkBanner', () => {
  it('shows the message in a region labelled Open to work while open to work', async () => {
    const doc = await renderHtml(OpenToWorkBanner, { openToWork: { enabled: true, message } });
    const banner = doc.querySelector('section[aria-label="Open to work"]');
    expect(banner?.querySelector('p')?.textContent).toBe(message);
  });

  it('renders nothing when not open to work', async () => {
    const doc = await renderHtml(OpenToWorkBanner, { openToWork: { enabled: false, message } });
    expect(doc.querySelector('section')).toBeNull();
    expect(doc.body.textContent.trim()).toBe('');
  });
});
