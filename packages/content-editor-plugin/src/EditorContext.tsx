'use client';

/**
 * Editor-scoped state, split across small contexts so high-frequency
 * updates (preview compile on every keystroke) don't re-render
 * consumers that only care about low-frequency state (current user,
 * the "insert link" dialog flag).
 *
 * Hoisting state into per-editor contexts (rather than a module-level
 * store) means unmounting `<Editor>` (e.g. leaving EDIT mode)
 * garbage-collects all of it automatically.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';
import type { NodeKey } from 'lexical';

export type EditorUser = { sid: string; displayName: string; email: string };

// --- Preview context (high-frequency: every keystroke) -----------------

interface PreviewContextValue {
  previewContent: SerializeResult | undefined;
  setPreviewContent: (content: SerializeResult | undefined) => void;
}
const PreviewContext = createContext<PreviewContextValue | null>(null);

// --- Error context (low-frequency, but separate so the status banner
// doesn't need to re-render on every preview update) -------------------

/**
 * Structured error for the status banner. Modelled after `vfile`
 * messages from MDX / remark so we can render line/column and a
 * human-friendly hint without ad-hoc string parsing in the banner.
 */
export interface EditorError {
  /** Short one-line summary, shown as the banner headline. */
  message: string;
  /** 1-based source line, when known. */
  line?: number;
  /** 1-based source column, when known. */
  column?: number;
  /**
   * Plain-English suggestion shown under the message (e.g. "escape `<`
   * as `\<`"). Optional — synthesised from `message` heuristically.
   */
  hint?: string;
  /** Original error string for the "details" disclosure. */
  raw?: string;
}

interface ErrorContextValue {
  error: EditorError | undefined;
  setError: (err: EditorError | undefined) => void;
}
const ErrorContext = createContext<ErrorContextValue | null>(null);

// --- User context (set once at mount; effectively static) -------------

interface UserContextValue {
  user: EditorUser | undefined;
  setUser: (user: EditorUser | undefined) => void;
}
const UserContext = createContext<UserContextValue | null>(null);

// --- Insert-link dialog flag (changes on dialog open/close) -----------

interface InsertLinkContextValue {
  isInsertingLink: boolean;
  setIsInsertingLink: (value: boolean) => void;
}
const InsertLinkContext = createContext<InsertLinkContextValue | null>(null);

// --- Shortcut-help dialog flag ---------------------------------------
//
// Two callers need to mutate this — the toolbar's `?` button and the
// global `Mod+/` shortcut — and one consumer renders the dialog.
// Hoisting to context means neither caller has to know about the
// dialog's internal state.

interface ShortcutHelpContextValue {
  isShortcutHelpOpen: boolean;
  setShortcutHelpOpen: (value: boolean) => void;
  toggleShortcutHelp: () => void;
}
const ShortcutHelpContext = createContext<ShortcutHelpContextValue | null>(null);

// --- Compile-in-flight flag (high-frequency-ish: toggles around every
// preview-action invocation, but boolean so cheap) ---------------------

interface CompileContextValue {
  isCompiling: boolean;
  setIsCompiling: (value: boolean) => void;
}
const CompileContext = createContext<CompileContextValue | null>(null);

// --- Save state ------------------------------------------------------
//
// Modelled as an explicit FSM rather than a pair of booleans so the
// pill UI can't end up in nonsense combinations (e.g. "saving" + "saved").
// Transitions:
//
//   clean  --user edits-->  dirty  --persist start-->  saving
//   saving --persist ok-->  saved  --user edits-->    dirty
//   saving --persist err-> dirty   (so the user can retry; banner shows
//                                   the actual error separately)
//
// `lastSavedAt` is captured at the saving -> saved transition so the
// pill can render "Saved 12s ago" without timing infrastructure
// downstream.

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved';

interface SaveContextValue {
  saveState: SaveState;
  lastSavedAt: number | undefined;
  /** Mark the editor dirty (called from a Lexical update listener). */
  markDirty: () => void;
  /** Mark a save as in-flight. */
  markSaving: () => void;
  /** Mark a save as complete; transitions to `saved` and stamps the time. */
  markSaved: () => void;
  /** Mark a save as failed; transitions back to `dirty` so retry is allowed. */
  markSaveFailed: () => void;
}
const SaveContext = createContext<SaveContextValue | null>(null);

// --- Line map (ref-backed, no re-render trigger) ----------------------
//
// `ErrorHighlightPlugin` needs to translate a compile error's
// `line: number` -> the Lexical block `NodeKey` that produced that
// line. `PreviewPlugin` builds the map on every successful compile.
//
// Storing the map in React state would re-render every consumer of
// this context on every keystroke. Instead we expose a ref-style
// getter / setter pair so the writer doesn't trigger any render; the
// reader (ErrorHighlightPlugin) only consults it lazily when an error
// is present.

export interface LineMapEntry {
  /** 1-based line → top-level block key. */
  lineToKey: Map<number, NodeKey>;
  /** The exact markdown string the map describes. */
  markdown: string;
}

interface LineMapContextValue {
  getLineMap: () => LineMapEntry | null;
  setLineMap: (next: LineMapEntry | null) => void;
}
const LineMapContext = createContext<LineMapContextValue | null>(null);

export interface EditorProviderProps {
  initialUser?: EditorUser;
  children: ReactNode;
}

export function EditorProvider({ initialUser, children }: EditorProviderProps) {
  const [previewContent, setPreviewContent] = useState<SerializeResult | undefined>(undefined);
  const [error, setError] = useState<EditorError | undefined>(undefined);
  const [user, setUser] = useState<EditorUser | undefined>(initialUser);
  const [isInsertingLink, setIsInsertingLink] = useState(false);
  const [isShortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const toggleShortcutHelp = useCallback(() => setShortcutHelpOpen(v => !v), []);
  const [isCompiling, setIsCompiling] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('clean');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);

  // Save-state transitions are funnelled through these stable
  // callbacks so consumers don't have to think about the FSM. They are
  // each useCallback'd separately so they retain identity even when
  // unrelated state changes — important because they feed into Lexical
  // listener registration dep arrays downstream.
  const markDirty = useCallback(() => {
    setSaveState(prev => (prev === 'saving' ? prev : 'dirty'));
  }, []);
  const markSaving = useCallback(() => setSaveState('saving'), []);
  const markSaved = useCallback(() => {
    setSaveState('saved');
    setLastSavedAt(Date.now());
  }, []);
  const markSaveFailed = useCallback(() => setSaveState('dirty'), []);

  // Line map lives in a ref so PreviewPlugin can update it on every
  // compile without re-rendering any consumer. See LineMapContext
  // declaration above for rationale.
  const lineMapRef = useRef<LineMapEntry | null>(null);
  const getLineMap = useCallback(() => lineMapRef.current, []);
  const setLineMap = useCallback((next: LineMapEntry | null) => {
    lineMapRef.current = next;
  }, []);

  // Each context value is memoised independently so changes to one
  // slice don't invalidate the others. Setters are stable references
  // returned by useState, so the dep arrays only need the value.
  const previewValue = useMemo<PreviewContextValue>(
    () => ({ previewContent, setPreviewContent }),
    [previewContent]
  );
  const errorValue = useMemo<ErrorContextValue>(() => ({ error, setError }), [error]);
  const userValue = useMemo<UserContextValue>(() => ({ user, setUser }), [user]);
  const insertLinkValue = useMemo<InsertLinkContextValue>(
    () => ({ isInsertingLink, setIsInsertingLink }),
    [isInsertingLink]
  );
  const shortcutHelpValue = useMemo<ShortcutHelpContextValue>(
    () => ({ isShortcutHelpOpen, setShortcutHelpOpen, toggleShortcutHelp }),
    [isShortcutHelpOpen, toggleShortcutHelp]
  );
  const compileValue = useMemo<CompileContextValue>(
    () => ({ isCompiling, setIsCompiling }),
    [isCompiling]
  );
  const saveValue = useMemo<SaveContextValue>(
    () => ({ saveState, lastSavedAt, markDirty, markSaving, markSaved, markSaveFailed }),
    [saveState, lastSavedAt, markDirty, markSaving, markSaved, markSaveFailed]
  );
  const lineMapValue = useMemo<LineMapContextValue>(
    () => ({ getLineMap, setLineMap }),
    [getLineMap, setLineMap]
  );

  return (
    <ComposedProviders
      providers={[
        [UserContext.Provider, userValue],
        [ErrorContext.Provider, errorValue],
        [InsertLinkContext.Provider, insertLinkValue],
        [SaveContext.Provider, saveValue],
        [CompileContext.Provider, compileValue],
        [LineMapContext.Provider, lineMapValue],
        [ShortcutHelpContext.Provider, shortcutHelpValue],
        [PreviewContext.Provider, previewValue]
      ]}
    >
      {children}
    </ComposedProviders>
  );
}

/**
 * Render an arbitrary list of `[Provider, value]` pairs as a
 * left-to-right nested tree. Strictly mechanical replacement for
 * an N-deep `<A.Provider><B.Provider>...</B></A>` ladder so we
 * can add or remove a slice with a one-line edit instead of
 * counting brackets across the whole component. The first entry
 * becomes the outermost provider; subsequent entries nest inside.
 *
 * Provider order is otherwise inconsequential: `useContext` reads
 * each slice independently, so re-orderings don't change behaviour.
 */
type ProviderEntry<T> = readonly [React.Provider<T>, T];

interface ComposedProvidersProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: ReadonlyArray<ProviderEntry<any>>;
  children: ReactNode;
}

function ComposedProviders({ providers, children }: ComposedProvidersProps) {
  return providers.reduceRight<ReactNode>(
    (acc, [Provider, value]) => <Provider value={value}>{acc}</Provider>,
    children
  );
}

function useRequiredContext<T>(ctx: React.Context<T | null>, name: string): T {
  const value = useContext(ctx);
  if (!value) {
    throw new Error(`${name} must be called inside <EditorProvider>.`);
  }
  return value;
}

// Selector hooks return individual slices so callers only subscribe
// to the state they actually use (rerender-defer-reads).
export const usePreviewContent = () =>
  useRequiredContext(PreviewContext, 'usePreviewContent').previewContent;
export const useSetPreviewContent = () =>
  useRequiredContext(PreviewContext, 'useSetPreviewContent').setPreviewContent;
export const useErrorMessage = () => useRequiredContext(ErrorContext, 'useErrorMessage');
export const useEditorUser = () => useRequiredContext(UserContext, 'useEditorUser');
export const useIsInsertingLink = () => useRequiredContext(InsertLinkContext, 'useIsInsertingLink');
export const useIsCompiling = () =>
  useRequiredContext(CompileContext, 'useIsCompiling').isCompiling;
export const useSetIsCompiling = () =>
  useRequiredContext(CompileContext, 'useSetIsCompiling').setIsCompiling;
export const useSaveState = () => useRequiredContext(SaveContext, 'useSaveState');
export const useLineMap = () => useRequiredContext(LineMapContext, 'useLineMap');
export const useShortcutHelp = () => useRequiredContext(ShortcutHelpContext, 'useShortcutHelp');

export type EditorContextValue = PreviewContextValue &
  ErrorContextValue &
  UserContextValue &
  InsertLinkContextValue &
  ShortcutHelpContextValue &
  CompileContextValue &
  SaveContextValue &
  LineMapContextValue;
