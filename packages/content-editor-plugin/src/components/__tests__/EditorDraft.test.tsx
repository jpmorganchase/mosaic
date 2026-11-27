import type { ReactNode } from 'react';
import { parseFrontmatter } from '@jpmorganchase/mosaic-serialisers/frontmatter';
import { $createParagraphNode, $getRoot, getNearestEditorFromDOMNode } from 'lexical';
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

test.each(['source', 'frontmatter'] as const)(
  'does not expose a transient %s editor during the splitter upgrade',
  async mode => {
    let frame: FrameRequestCallback | undefined;
    const requestFrame = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation(callback => {
        frame = callback;
        return 1;
      });
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    try {
      modeState.mode = mode;
      const view = mountEditor();
      expect(screen.queryByRole('textbox', { name: 'Markdown source editor' })).toBeNull();
      expect(screen.queryByDisplayValue('Authored title')).toBeNull();
      await act(async () => frame?.(0));
      const input =
        mode === 'source'
          ? screen.getByRole('textbox', { name: 'Markdown source editor' })
          : screen.getByDisplayValue('Authored title');
      fireEvent.change(input, { target: { value: 'Early draft' } });
      view.rerender(<Editor {...view.props} />);
      expect(screen.getByDisplayValue('Early draft')).toBeVisible();
      expect(modeState.saveState).toBe('dirty');
    } finally {
      requestFrame.mockRestore();
      cancelFrame.mockRestore();
    }
  }
);

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

test.each(['metadata', 'rename'] as const)(
  'saves %s changes to a frontmatter-only page',
  async change => {
    const persist = vi.fn(async function* (
      _input: Parameters<NonNullable<EditorProps['persist']>>[0]
    ): AsyncGenerator<PersistEvent> {
      yield { kind: 'complete', prHref: null };
    });
    mountEditor({
      persist,
      rawSource: {
        kind: 'raw',
        bytes:
          '---\ntitle: Authored title\nlayout: Article\ndescription: ""\ntags: []\nsummary: To be cleared\n---\n',
        namespace: 'docs'
      }
    });
    await screen.findByTestId('split-ready');
    if (change === 'metadata') {
      fireEvent.change(screen.getByDisplayValue('Authored title'), {
        target: { value: 'Draft title' }
      });
      fireEvent.change(screen.getByDisplayValue('To be cleared'), { target: { value: '' } });
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
    expect(payload.markdown.trim()).toBe('');
    if (change === 'metadata') {
      expect(parseFrontmatter(`---\n${payload.frontmatter}\n---\n`).data).toEqual({
        title: 'Draft title',
        layout: 'Article',
        description: '',
        tags: []
      });
    } else {
      expect(payload.targetRoute).toBe('/docs/renamed.mdx');
      expect(payload.frontmatter).toBeUndefined();
    }
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

test('removes deleted authored fields from the preview while preserving plugin values', async () => {
  const compilePreview = vi.fn(async (_source: string) => ({
    compiledSource: '',
    frontmatter: {},
    scope: {}
  }));
  const original =
    '---\ntitle: Page title\nlayout: Article\nsummary: Old summary\nsettings:\n  kept: original\n  removed: old value\n  related:\n    $tag: featured\n---\n# Body\n';
  const processedSource =
    '---\ntitle: Page title\nlayout: Article\nsummary: Old summary\nnavigation: Example navigation\nsettings:\n  kept: original\n  removed: old value\n  generated: computed\n  related: [Expanded page]\n---\n# Body\n';
  mountEditor({
    content: processedSource,
    rawSource: { kind: 'raw', bytes: original, namespace: 'docs' },
    compilePreview
  });
  await screen.findByTestId('split-ready');

  await userEvent.click(screen.getByRole('button', { name: 'Remove field summary' }));
  fireEvent.change(screen.getByDisplayValue(/removed: old value/), {
    target: { value: 'kept: edited\nrelated:\n  $tag: featured' }
  });

  await waitFor(() => {
    const lastCompile = compilePreview.mock.lastCall?.[0];
    expect(lastCompile).toBeDefined();
    const result = parseFrontmatter(lastCompile ?? '');
    expect(result.data).not.toHaveProperty('summary');
    expect(result.data).toMatchObject({
      navigation: 'Example navigation',
      settings: {
        kept: 'edited',
        generated: 'computed',
        related: ['Expanded page']
      }
    });
    expect(result.data.settings).not.toHaveProperty('removed');
  });
});

test('refreshes the preview after clearing the Visual draft', async () => {
  modeState.mode = 'wysiwyg';
  const compilePreview = vi.fn(async (source: string) => ({
    compiledSource: parseFrontmatter(source).content.trim() ? 'Original preview' : 'Empty preview',
    frontmatter: {},
    scope: {}
  }));
  mountEditor({
    compilePreview,
    PreviewComponent: ({ source }) => (
      <p>{source && 'compiledSource' in source && source.compiledSource}</p>
    )
  });
  await screen.findByText('Original preview');
  const element = document.querySelector('[contenteditable=true]');
  const editor = element && getNearestEditorFromDOMNode(element);
  expect(editor).toBeTruthy();

  await act(async () => {
    editor?.update(
      () => {
        $getRoot().clear();
        $getRoot().append($createParagraphNode());
      },
      { discrete: true }
    );
  });

  expect(await screen.findByText('Empty preview')).toBeVisible();
  expect(screen.queryByText('Original preview')).not.toBeInTheDocument();
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
  expect(await screen.findByDisplayValue('Other title')).toBeVisible();
  expect(screen.queryByDisplayValue('Draft title')).not.toBeInTheDocument();
});

test('keeps the draft and its original source hash after a same-page refresh and save conflict', async () => {
  const expectedSourceHash = 'a'.repeat(64);
  const persist = vi.fn(async function* (
    _input: Parameters<NonNullable<EditorProps['persist']>>[0]
  ): AsyncGenerator<PersistEvent> {
    yield { kind: 'error', message: 'This page changed after you opened it.' };
  });
  const view = mountEditor({
    persist,
    rawSource: { kind: 'raw', bytes: authored, namespace: 'docs', sourceHash: expectedSourceHash }
  });
  await screen.findByTestId('split-ready');
  fireEvent.change(screen.getByDisplayValue('Authored title'), {
    target: { value: 'Draft title' }
  });
  view.rerender(
    <Editor
      {...view.props}
      rawSource={{
        kind: 'raw',
        namespace: 'docs',
        bytes: authored.replace('Authored title', 'Another author changed this title'),
        sourceHash: 'b'.repeat(64)
      }}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: 'Review save' }));
  await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));
  await screen.findByText(/This page changed after you opened it/);
  expect(persist).toHaveBeenCalledExactlyOnceWith({
    route: '/docs/page.mdx',
    markdown: body,
    frontmatter: expect.stringContaining('title: Draft title'),
    expectedSourceHash
  });
  expect(modeState.saveState).toBe('dirty');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByDisplayValue('Draft title')).toBeVisible();
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
