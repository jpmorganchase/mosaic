import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { EditorMode } from '../../useEditorMode';

const modeState = vi.hoisted(() => ({
  mode: 'frontmatter' as EditorMode,
  prepareModeFlip: undefined as ((mode: EditorMode) => void) | undefined,
  openSave: undefined as (() => void) | undefined,
  saveState: undefined as string | undefined
}));
vi.mock('../../useEditorMode', () => ({ useEditorMode: () => ({ mode: modeState.mode }) }));
vi.mock('../Toolbar/Toolbar', async () => {
  const { useModeBridge } = await import('../ModeBridgeContext');
  return {
    default: ({ onSave, saveDisabled }: { onSave: () => void; saveDisabled?: boolean }) => {
      modeState.prepareModeFlip = useModeBridge()?.prepareModeFlip;
      modeState.openSave = onSave;
      return (
        <button disabled={saveDisabled} onClick={onSave}>
          Review save
        </button>
      );
    }
  };
});
vi.mock('../StatusBanner', () => ({ default: () => null }));
vi.mock('../RouteNoticeBanner', () => ({ default: () => null }));
vi.mock('../ShortcutHelpDialog', () => ({ ShortcutHelpDialog: () => null }));
vi.mock('../../plugins/LeaveGuardPlugin', async () => {
  const { useSaveState } = await import('../../EditorContext');
  return {
    LeaveGuardPlugin: () => {
      modeState.saveState = useSaveState().saveState;
      return null;
    }
  };
});
vi.mock('../../plugins/KeyboardShortcutsPlugin', () => ({ KeyboardShortcutsPlugin: () => null }));
vi.mock('react-split', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-mosaic-testid="split-ready">{children}</div>
  )
}));

import Editor, { type EditorProps } from '../Editor';
import type { PersistEvent } from '../PersistEditDialog';

const body = ':fragment{src="./shared.mdx"}\n\nOriginal paragraph.\n';
const authored = `---\ntitle: Authored title\nlayout: Article\nsettings:\n  enabled: true\n---\n${body}`;
const processed =
  '---\ntitle: Processed title\nlayout: Article\nroute: /public/page\n---\nExpanded shared content.\n\nOriginal paragraph.\n';
const defaultProps: EditorProps = {
  content: processed,
  rawSource: { kind: 'raw', bytes: authored, namespace: 'docs' },
  route: '/docs/page.mdx',
  components: {},
  PreviewComponent: ({ meta }) => <p>Preview: {String(meta?.route)}</p>,
  compilePreview: async () => ({ compiledSource: '', frontmatter: {}, scope: {} })
};

beforeEach(() => {
  modeState.mode = 'frontmatter';
});

function mountEditor(overrides: Partial<EditorProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  const view = render(<Editor {...props} />);
  const changeMode = (mode: EditorMode) => {
    act(() => modeState.prepareModeFlip?.(mode));
    modeState.mode = mode;
    view.rerender(<Editor {...props} />);
  };
  return { ...view, props, changeMode };
}

test.each(['body', 'body across modes', 'metadata', 'visual metadata', 'rename'])(
  'preserves fragment directives in a %s save',
  async change => {
    const persist = vi.fn(async function* (
      _input: Parameters<NonNullable<EditorProps['persist']>>[0]
    ): AsyncGenerator<PersistEvent> {
      yield { kind: 'complete', prHref: null };
    });
    const view = mountEditor({ persist });
    await waitFor(() => expect(screen.getByDisplayValue('Authored title')).toBeVisible());
    // Wait through the splitter's initial layout upgrade before interacting.
    await screen.findByTestId('split-ready');
    let expectedBody = body;
    if (change === 'visual metadata') {
      view.changeMode('wysiwyg');
      view.changeMode('frontmatter');
      expectedBody = body.trimEnd();
    }
    if (change === 'metadata' || change === 'visual metadata') {
      fireEvent.change(screen.getByDisplayValue('Authored title'), {
        target: { value: 'Draft title' }
      });
      view.changeMode('source');
      view.changeMode('frontmatter');
      expect(screen.getByDisplayValue('Draft title')).toBeVisible();
    } else if (change === 'body' || change === 'body across modes') {
      view.changeMode('source');
      expectedBody = body.replace('Original paragraph.', 'Edited paragraph.');
      fireEvent.change(screen.getByRole('textbox', { name: 'Markdown source editor' }), {
        target: { value: expectedBody }
      });
      if (change === 'body across modes') {
        view.changeMode('wysiwyg');
        view.rerender(<Editor {...view.props} />);
        view.changeMode('source');
        expectedBody = expectedBody.trimEnd();
      }
    }
    await userEvent.click(screen.getByRole('button', { name: 'Review save' }));
    if (change === 'rename') {
      fireEvent.change(screen.getByLabelText('File path'), {
        target: { value: '/docs/renamed.mdx' }
      });
    }
    await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));
    await waitFor(() => expect(persist).toHaveBeenCalledOnce());
    const payload = persist.mock.calls[0][0];
    expect(payload).toMatchObject({ route: '/docs/page.mdx', markdown: expectedBody });
    expect(payload.markdown).not.toContain('Expanded shared content');
    if (change === 'metadata' || change === 'visual metadata')
      expect(payload).toHaveProperty('frontmatter', expect.stringContaining('title: Draft title'));
    if (change === 'rename') expect(payload).toHaveProperty('targetRoute', '/docs/renamed.mdx');
  }
);

test('retains invalid YAML and valid fields through repeated mode round trips', async () => {
  const view = mountEditor();
  await screen.findByTestId('split-ready');
  fireEvent.change(screen.getByDisplayValue('Authored title'), {
    target: { value: 'Draft title' }
  });
  const island = screen.getByDisplayValue('enabled: true');
  fireEvent.change(island, { target: { value: 'enabled: [' } });
  for (const mode of ['source', 'wysiwyg', 'source'] as const) {
    view.changeMode(mode);
    expect(screen.getByRole('button', { name: 'Review save' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Correct the invalid fields');
    act(() => modeState.openSave?.());
    expect(screen.queryByLabelText('File path')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'title' })).not.toBeInTheDocument();
    view.changeMode('frontmatter');
    expect(screen.getByDisplayValue('Draft title')).toBeVisible();
    expect(screen.getByDisplayValue('enabled: [')).toBeVisible();
  }
  fireEvent.change(screen.getByDisplayValue('enabled: ['), {
    target: { value: 'enabled: false\n' }
  });
  expect(screen.getByRole('button', { name: 'Review save' })).toBeEnabled();
});

test('recompiles the preview when an invalid frontmatter edit becomes valid', async () => {
  const compilePreview = vi.fn(async (_source: string) => ({
    compiledSource: '',
    frontmatter: {},
    scope: {}
  }));
  mountEditor({ compilePreview });
  await screen.findByTestId('split-ready');
  fireEvent.change(screen.getByDisplayValue('enabled: true'), {
    target: { value: 'enabled: [' }
  });
  fireEvent.change(screen.getByDisplayValue('enabled: ['), {
    target: { value: 'enabled: false\n' }
  });
  await waitFor(() =>
    expect(compilePreview).toHaveBeenCalledWith(expect.stringContaining('enabled: false'))
  );
});

test('guards a frontmatter field reverted to its on-disk value after a save', async () => {
  const persist = vi.fn(async function* (): AsyncGenerator<PersistEvent> {
    yield { kind: 'complete', prHref: null };
  });
  mountEditor({ persist });
  await screen.findByTestId('split-ready');
  fireEvent.change(screen.getByDisplayValue('Authored title'), {
    target: { value: 'Draft title' }
  });
  expect(modeState.saveState).toBe('dirty');
  await userEvent.click(screen.getByRole('button', { name: 'Review save' }));
  await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));
  await waitFor(() => expect(modeState.saveState).toBe('saved'));
  // The saved change and the on-disk file both differ from this draft.
  fireEvent.change(screen.getByDisplayValue('Draft title'), {
    target: { value: 'Authored title' }
  });
  expect(modeState.saveState).toBe('dirty');
});

test('resets the whole draft when the host changes the backing document', async () => {
  const view = mountEditor();
  await screen.findByTestId('split-ready');
  fireEvent.change(screen.getByDisplayValue('Authored title'), {
    target: { value: 'Draft title' }
  });
  view.rerender(
    <Editor
      {...view.props}
      route="/docs/other.mdx"
      rawSource={{
        kind: 'raw',
        namespace: 'docs',
        bytes: authored.replace('Authored title', 'Other title')
      }}
    />
  );
  expect(screen.getByDisplayValue('Other title')).toBeVisible();
  expect(screen.queryByDisplayValue('Draft title')).not.toBeInTheDocument();
});

test('blocks both button and shortcut saves when authored bytes are unavailable', () => {
  const persist = vi.fn();
  mountEditor({ rawSource: { kind: 'not-found' }, persist });
  expect(screen.getByRole('button', { name: 'Review save' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('original source could not be loaded');
  act(() => modeState.openSave?.());
  expect(screen.queryByLabelText('File path')).not.toBeInTheDocument();
  expect(persist).not.toHaveBeenCalled();
});

test('reseeds safely when authored bytes become available for the same document', async () => {
  modeState.mode = 'source';
  const view = mountEditor({ rawSource: { kind: 'not-found' } });
  await screen.findByTestId('split-ready');
  expect(
    (screen.getByRole('textbox', { name: 'Markdown source editor' }) as HTMLTextAreaElement).value
  ).toContain('Expanded shared content');
  view.rerender(<Editor {...defaultProps} />);
  await screen.findByTestId('split-ready');
  expect(screen.getByRole('textbox', { name: 'Markdown source editor' })).toHaveValue(body);
  expect(screen.getByRole('button', { name: 'Review save' })).toBeEnabled();
});

test('preserves body edits when Visual mode rerenders after consuming its mode bridge', async () => {
  modeState.mode = 'source';
  const view = mountEditor();
  await screen.findByTestId('split-ready');
  const edited = 'A different length draft body.';
  fireEvent.change(screen.getByRole('textbox', { name: 'Markdown source editor' }), {
    target: { value: edited }
  });
  view.changeMode('wysiwyg');
  // Preview/context updates rerender the shell after the bridge installer
  // clears its one-use seed. They must not create a new Lexical editor.
  view.rerender(<Editor {...view.props} />);
  view.changeMode('source');
  expect(screen.getByRole('textbox', { name: 'Markdown source editor' })).toHaveValue(edited);
});

test('pristine mode switches still prevent a message-only save', async () => {
  modeState.mode = 'source';
  const persist = vi.fn();
  const view = mountEditor({
    persist,
    loadSaveDefaults: async () => ({ supportsCommitMessage: true, commitMessage: 'Source default' })
  });
  await screen.findByTestId('split-ready');
  view.changeMode('wysiwyg');
  view.changeMode('source');
  await userEvent.click(screen.getByRole('button', { name: 'Review save' }));
  const message = await screen.findByRole('textbox', { name: 'Commit message' });
  await userEvent.type(message, ' with an explanation');
  expect(screen.getByRole('button', { name: 'Raise Pull Request' })).toBeDisabled();
  expect(persist).not.toHaveBeenCalled();
});
