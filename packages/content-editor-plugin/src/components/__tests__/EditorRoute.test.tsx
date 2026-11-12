import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

// Mount the real Editor and PersistDialog boundary. The unrelated
// editing surfaces and router integrations are outside this regression.
vi.mock('../../useEditorMode', () => ({ useEditorMode: () => ({ mode: 'frontmatter' }) }));
vi.mock('../Toolbar/Toolbar', () => ({
  default: ({ onSave }: { onSave: () => void }) => <button onClick={onSave}>Review save</button>
}));
vi.mock('../FrontmatterViewer/FrontmatterPanel', () => ({ FrontmatterPanel: () => null }));
vi.mock('../StatusBanner', () => ({ default: () => null }));
vi.mock('../RouteNoticeBanner', () => ({ default: () => null }));
vi.mock('../ShortcutHelpDialog', () => ({ ShortcutHelpDialog: () => null }));
vi.mock('../../plugins/LeaveGuardPlugin', () => ({ LeaveGuardPlugin: () => null }));
vi.mock('../../plugins/KeyboardShortcutsPlugin', () => ({ KeyboardShortcutsPlugin: () => null }));
vi.mock('react-split', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

import Editor from '../Editor';
import type { PersistEvent } from '../PersistEditDialog';

const content =
  '---\ntitle: Published page\nroute: /public/published\nfullPath: /docs/start/page.mdx\n---\n# Original body';
const compilePreview = async () => ({ compiledSource: '', frontmatter: {}, scope: {} });
const Preview = ({ meta }: { meta?: Record<string, unknown> }) => (
  <p>Preview route: {String(meta?.route)}</p>
);

test('saves and renames the host backing file while preserving the public preview route', async () => {
  const persist = vi.fn(async function* (): AsyncGenerator<PersistEvent> {
    yield { kind: 'complete', prHref: null };
  });
  render(
    <Editor
      content={content}
      rawSource={{ kind: 'raw', bytes: content, namespace: 'docs' }}
      route="/docs/start/page.mdx"
      components={{}}
      PreviewComponent={Preview}
      compilePreview={compilePreview}
      persist={persist}
    />
  );

  expect(screen.getByText('Preview route: /public/published')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Review save' }));
  const target = screen.getByLabelText('File path');
  expect(target).toHaveValue('/docs/start/page.mdx');
  await userEvent.clear(target);
  await userEvent.type(target, '/docs/start/renamed.mdx');
  await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));

  expect(await screen.findByRole('heading', { name: 'Changes Saved Successfully' })).toBeVisible();
  expect(persist).toHaveBeenCalledExactlyOnceWith({
    route: '/docs/start/page.mdx',
    targetRoute: '/docs/start/renamed.mdx',
    markdown: '# Original body'
  });
});

test('retains frontmatter route as the save fallback for hosts without an explicit backing route', async () => {
  render(
    <Editor
      content={content}
      rawSource={{ kind: 'raw', bytes: content, namespace: 'docs' }}
      components={{}}
      PreviewComponent={Preview}
      compilePreview={compilePreview}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: 'Review save' }));

  expect(screen.getByLabelText('File path')).toHaveValue('/public/published');
});
