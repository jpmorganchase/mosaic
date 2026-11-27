import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { LlmsMetadata } from '../LlmsMetadata';

const getLlmsDiscovery = vi.hoisted(() => vi.fn());
vi.mock('@jpmorganchase/mosaic-site-middleware', () => ({ getLlmsDiscovery }));

test.each(['/salt/llms.txt', '/salt/components/llms.txt', '/llms.txt'])(
  'server-renders a single alternate and describedby link for %s',
  async indexUrl => {
    getLlmsDiscovery.mockResolvedValue({ markdownUrl: '/salt/button.md', indexUrl });
    const html = renderToStaticMarkup(
      await LlmsMetadata({ route: '/salt/button%20notes', pathname: '/salt/button%2520notes' })
    );
    expect(getLlmsDiscovery).toHaveBeenCalledWith('/salt/button%20notes', '/salt/button%2520notes');
    expect(html).toBe(
      `<link rel="alternate" type="text/markdown" href="/salt/button.md"/><link rel="describedby" href="${indexUrl}"/>`
    );
  }
);

test('does not advertise excluded pages or a disabled plugin', async () => {
  getLlmsDiscovery.mockResolvedValue(undefined);
  expect(await LlmsMetadata({ route: '/excluded' })).toBeNull();
});
