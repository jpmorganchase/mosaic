import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../NamespaceFrame', () => ({
  FrameSync: ({ route }: { route?: string }) => <span data-frame-sync={route ?? 'namespace'} />
}));
vi.mock('../../error', () => ({
  default: ({ error }: { error: Error }) => <p>{error.message}</p>
}));

import NamespaceError from '../error';

describe('GIVEN a page in a namespace fails', () => {
  test('THEN the error renders inside the namespace with its own header config', () => {
    const html = renderToStaticMarkup(
      <NamespaceError error={new Error('Content server unavailable')} retry={() => {}} />
    );
    expect(html).toBe('<span data-frame-sync="namespace"></span><p>Content server unavailable</p>');
  });
});
