'use client';

/**
 * Editable frontmatter form. Mounted by {@link FrontmatterPanel}
 * when `?mode=frontmatter` AND the host supplied a raw on-disk
 * source (`rawSource.kind === 'raw'`); the panel falls back to a
 * read-only viewer otherwise.
 *
 * Raw-only because Mosaic build plugins enrich frontmatter
 * heavily (`sidebar`, `breadcrumbs`, `navigation`,
 * `tableOfContents`, `readingTime`, …). Editing those enriched
 * fields is at best pointless and at worst lossy on the next
 * build. The raw on-disk bytes are the only reliable source of
 * "author-owned" keys.
 *
 * Per-field widgets are picked by JS type:
 *   - string → multiline-aware text input
 *   - number → numeric input
 *   - boolean → switch
 *   - string[] → comma-separated text input
 *   - object / mixed-typed array → YAML island (escape hatch)
 *
 * State lives as a flat row list; on every change we re-serialise
 * the rows to YAML and stash it on `snapshotRef` so the save
 * dialog can pull a byte-stable representation at submit time
 * without lifting state across the React tree.
 *
 * Snapshot is refused (returns `undefined`) when any YAML island
 * fails to parse or any required field is empty — the save dialog
 * then omits the `frontmatter` field from the payload and the
 * workflow keeps the on-disk bytes verbatim. Refusing to save
 * broken frontmatter is the right default; the body save proceeds
 * independently.
 */

import { SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import matter from 'gray-matter';
import {
  Banner,
  BannerContent,
  Button,
  ComboBox,
  FormField,
  FormFieldHelperText,
  FormFieldLabel,
  Input,
  Option,
  Switch,
  Text,
  Tooltip
} from '@salt-ds/core';

import { useLayoutNames, useLayoutsAreStrict } from '../../LayoutNamesContext';
import style from './FrontmatterEditor.css';

export interface FrontmatterEditorProps {
  /**
   * The pre-plugin authored frontmatter, parsed from the raw
   * on-disk source. Treated as the seed for the form; subsequent
   * edits live in component state until save.
   */
  initial: Record<string, unknown>;
  /**
   * Caption identifying the data source (e.g. "On-disk source ·
   * docs"). Echoed under the banner so authors can tell which
   * file the form is editing — important when a namespace
   * remount points the same route at a different source.
   */
  pillLabel: string;
  /**
   * Snapshot getter installed by the parent. Returns the current
   * form state serialised back to bare YAML (no `---` fences),
   * or `undefined` if the form is currently in an unsaveable
   * state (parse error in a YAML island, empty required field).
   * The dialog reads this at save time and decides whether to
   * include `frontmatter` in the payload.
   *
   * Passed as a ref-setter (rather than a callback prop) because
   * the parent needs to hand it to the save dialog, which is a
   * sibling component — a normal `onChange`-driven prop chain
   * would mean lifting the form state up and out of the editor
   * for no benefit.
   */
  snapshotRef: React.RefObject<(() => string | undefined) | null>;
  /**
   * Read-only YAML that the snapshot would produce on mount,
   * stashed once by the parent before this component is
   * constructed. Used as the baseline for the dialog's "did the
   * author change anything?" comparison so we can skip the
   * frontmatter payload when nothing actually changed.
   *
   * Not a `defaultValue` for the form itself — `initial` already
   * seeds the form. This is purely a parity check exposed back
   * to the parent.
   */
  originalYamlRef: React.RefObject<string>;
  /**
   * Top-level frontmatter keys that must remain present and
   * non-empty. Defaults to `DEFAULT_REQUIRED_KEYS`.
   *
   * For each required key:
   *   - the row renders a Salt `necessity="required"` hint;
   *   - the remove button is omitted;
   *   - if the key is missing from `initial` we synthesise an
   *     empty row pinned to the top so the gap is visible
   *     before save rather than later in a broken plugin;
   *   - if the value is empty the snapshot getter returns
   *     `undefined`, which propagates through the save dialog
   *     as "frontmatter not currently saveable" (same gate as
   *     parse errors).
   *
   * Pass a wider list for stricter requirements (e.g.
   * `['title', 'layout', 'description']`) or `[]` to opt out.
   */
  requiredKeys?: readonly string[];
}

/**
 * Built-in required-key set:
 *
 *   - `title`  — read by Sidebar, Breadcrumbs, SearchIndex;
 *                missing or empty silently breaks nav labels.
 *   - `layout` — selects the page's React layout component;
 *                missing falls back to a default that's almost
 *                never right for a real doc.
 */
const DEFAULT_REQUIRED_KEYS = ['title', 'layout'] as const;

/**
 * Discriminated union of the form-row kinds the form knows how
 * to render. `complex` is the escape hatch for shapes that
 * don't fit a scalar/tag widget — anything object-typed or a
 * heterogeneous array. The discriminant carries the parsed
 * value (or, for `complex` while editing, a raw YAML string +
 * parse error).
 */
type Row =
  | { kind: 'string'; key: string; value: string }
  | { kind: 'number'; key: string; value: string }
  | { kind: 'boolean'; key: string; value: boolean }
  | { kind: 'tags'; key: string; value: string[] }
  | {
      kind: 'complex';
      key: string;
      // The raw YAML the user is editing for this subtree.
      yaml: string;
      // The last successfully parsed value; we serialise this on
      // snapshot, so a transient parse error doesn't blow away
      // the saved value.
      lastGood: unknown;
      // null when parsing OK; the YAML error message when not.
      // Renders as an inline hint and gates whether we treat
      // the row as snapshot-eligible.
      parseError: string | null;
    };

/**
 * Pick a row kind for a value freshly read out of the parsed
 * frontmatter. Heuristics, not validation — anything that
 * doesn't fit the scalar set falls through to `complex` and
 * gets the YAML island.
 *
 * `string[]` where every element is a string is treated as
 * tags; mixed-type arrays go through `complex` because there's
 * no widget that round-trips them cleanly.
 */
function inferRow(key: string, value: unknown): Row {
  if (typeof value === 'string') return { kind: 'string', key, value };
  if (typeof value === 'number') return { kind: 'number', key, value: String(value) };
  if (typeof value === 'boolean') return { kind: 'boolean', key, value };
  if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
    return { kind: 'tags', key, value: value as string[] };
  }
  return {
    kind: 'complex',
    key,
    yaml: serialiseSubtreeToYaml(value),
    lastGood: value,
    parseError: null
  };
}

/**
 * Strip the `---` fences gray-matter wraps around its output.
 * Trailing whitespace is collapsed BEFORE the closing fence
 * regex runs — gray-matter emits `---\n\n` for non-scalar
 * values, so a naive `/---\r?\n?$/` misses the fence across
 * the blank line and leaks `---` into the result.
 */
function stripFences(yaml: string): string {
  return yaml
    .replace(/^---\r?\n/, '')
    .replace(/\s+$/, '')
    .replace(/\r?\n?---$/, '');
}

/**
 * Serialise a single (non-scalar) subtree to YAML. Re-uses
 * `gray-matter.stringify` (via a `{ __value: subtree }` wrapper,
 * since the stringifier expects an object) so the result is
 * byte-consistent with what we'd write for the whole document,
 * then strips the fences and the wrapper key.
 *
 * Falls back to a JSON dump for un-serialisable subtrees
 * (cyclic refs, BigInt, functions, …) so the user at least
 * sees something they can fix manually.
 */
function serialiseSubtreeToYaml(value: unknown): string {
  try {
    const full = matter.stringify('', { __value: value } as Record<string, unknown>);
    const body = stripFences(full);
    // gray-matter emits `__value:` followed by either an inline
    // scalar or a newline-then-indented block. Unindent the
    // block by 2 spaces (js-yaml's default indent) so the
    // textarea content is left-aligned.
    const oneLine = body.match(/^__value:\s*(.*)$/);
    if (oneLine) return oneLine[1];
    return body
      .replace(/^__value:\s*\n?/, '')
      .split('\n')
      .map(line => line.replace(/^ {2}/, ''))
      .join('\n');
  } catch {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }
}

/**
 * Parse the YAML in a `complex` row back into a JS value. Wraps
 * with `__value:` then strips it so the same stringifier code
 * path can round-trip any shape (scalars, arrays, objects).
 */
function parseSubtreeYaml(yaml: string): unknown {
  const wrapped = `__value: ${yaml.includes('\n') ? `\n${yaml.replace(/^/gm, '  ')}` : yaml}`;
  const { data } = matter(`---\n${wrapped}\n---\n`);
  return (data as { __value: unknown }).__value;
}

/**
 * Reassemble the whole frontmatter object from a row list. Order
 * is preserved (object literals iterate in insertion order in
 * modern JS), which matters for the PR diff — re-ordering keys
 * on every save would generate phantom changes.
 *
 * Rows whose value is "empty in a meaningful way" are pruned:
 *   - empty string for `string` (an author who deletes the
 *     content of a field expects the field to go away, not to
 *     remain present as `""`)
 *   - empty array for `tags`
 *
 * Number/boolean/complex rows are always emitted — `0` and
 * `false` are legitimate values, and a complex row's `lastGood`
 * is whatever the last successful parse produced.
 */
function buildObject(rows: Row[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.key) continue;
    switch (row.kind) {
      case 'string':
        if (row.value !== '') out[row.key] = row.value;
        break;
      case 'number': {
        const n = Number(row.value);
        if (row.value !== '' && Number.isFinite(n)) out[row.key] = n;
        break;
      }
      case 'boolean':
        out[row.key] = row.value;
        break;
      case 'tags':
        if (row.value.length > 0) out[row.key] = row.value;
        break;
      case 'complex':
        // Use the last successfully parsed value even when the
        // current YAML doesn't parse — keeps a transient typo
        // from blanking the field in the payload. The
        // snapshot getter still refuses to serialise when ANY
        // row has a parseError, so the save side won't proceed
        // with stale data; this just keeps the in-memory shape
        // sensible while the user fixes their typo.
        out[row.key] = row.lastGood;
        break;
    }
  }
  return out;
}

/**
 * Serialise the whole object back to YAML for the snapshot ref.
 * Empty object → empty string (which the save flow treats as
 * "user removed all frontmatter" — a legitimate state for very
 * minimal pages).
 */
function serialiseRows(rows: Row[]): string {
  const obj = buildObject(rows);
  if (Object.keys(obj).length === 0) return '';
  return stripFences(matter.stringify('', obj));
}

/**
 * Heuristic: should the string input be a multi-line textarea
 * (e.g. for `description`, `summary`) or a single-line input
 * (e.g. for `title`, `layout`)? Length OR an embedded newline
 * trips it into multi-line mode. Authors who paste a paragraph
 * into `description` get a textarea automatically; the common
 * case of a one-word `layout` stays a tidy single-line input.
 */
function isMultilineString(value: string): boolean {
  return value.includes('\n') || value.length > 80;
}

/**
 * Test whether a row's current value would satisfy a required-key
 * constraint. Empty string / empty array / missing scalar all
 * fail; numbers and booleans always satisfy (zero and false are
 * legitimate values for those types).
 *
 * For `complex` rows we treat any successfully-parsed value as
 * satisfying — a required field like `title` shouldn't be a
 * complex YAML subtree in practice, but if someone goes out of
 * their way to make it one we don't want to second-guess.
 */
function rowIsEmpty(row: Row): boolean {
  switch (row.kind) {
    case 'string':
      return row.value.trim() === '';
    case 'number':
      return row.value.trim() === '';
    case 'boolean':
      return false;
    case 'tags':
      return row.value.length === 0;
    case 'complex':
      return row.parseError !== null || row.lastGood === undefined || row.lastGood === null;
  }
}

/**
 * Build the seed row list from authored frontmatter. Required
 * keys missing from `initial` are synthesised as empty string
 * rows pinned to the top so the gap is visible in the form
 * rather than later in a broken plugin.
 */
function seedRows(initial: Record<string, unknown>, requiredKeys: readonly string[]): Row[] {
  const seeded = Object.entries(initial).map(([k, v]) => inferRow(k, v));
  const seededKeys = new Set(seeded.map(r => r.key));
  const missingRequired: Row[] = requiredKeys
    .filter(k => !seededKeys.has(k))
    .map(k => ({ kind: 'string' as const, key: k, value: '' }));
  return [...missingRequired, ...seeded];
}

/**
 * Apply a YAML edit to a `complex` row. Parse failures update
 * `parseError` without overwriting `lastGood`, so the user's
 * last working value survives a mid-typo state (the snapshot
 * getter still refuses to serialise while `parseError` is set).
 */
function applyComplexYamlEdit(row: Extract<Row, { kind: 'complex' }>, yaml: string): Row {
  try {
    return { ...row, yaml, lastGood: parseSubtreeYaml(yaml), parseError: null };
  } catch (err) {
    return { ...row, yaml, parseError: err instanceof Error ? err.message : String(err) };
  }
}

export function FrontmatterEditor({
  initial,
  pillLabel,
  snapshotRef,
  originalYamlRef,
  requiredKeys = DEFAULT_REQUIRED_KEYS
}: FrontmatterEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => seedRows(initial, requiredKeys));
  const [newKey, setNewKey] = useState('');

  const requiredSet = useMemo(() => new Set(requiredKeys), [requiredKeys]);

  // Host-registered layout names (via `<LayoutNamesProvider>` from
  // `mosaic-layouts`). Drives the layout-field picker in
  // `RowWidget`, the unknown-value validation in `RowEditor`, the
  // auto-selection effect below, and (when `strict`) the
  // snapshot-refusal gate.
  const layoutNames = useLayoutNames();
  const layoutsAreStrict = useLayoutsAreStrict();

  // Auto-select the only known layout when the field is empty.
  // Common on a fresh new-page flow: the template seeds `layout:
  // ''` to surface the required-hint, but if the host has
  // registered exactly one layout there's no meaningful choice to
  // make — pre-fill it so the author doesn't have to.
  //
  // Gated tightly to avoid surprising the author:
  //   - exactly one known layout (`length === 1`),
  //   - the current row value is empty (so we never overwrite a
  //     deliberate pick — including the empty-on-purpose case
  //     where the author cleared the field),
  //   - the row is `string`-kind (don't molest a YAML island).
  //
  // The `useEffect` fires on every render where the dep array
  // changes; the inner setRows is a no-op when no row matches,
  // so the steady-state cost is one shallow scan of `rows`.
  useEffect(() => {
    if (!layoutNames || layoutNames.length !== 1) return;
    const onlyName = layoutNames[0];
    setRows(prev => {
      let mutated = false;
      const next = prev.map(row => {
        if (row.kind !== 'string') return row;
        if (row.key !== 'layout') return row;
        if (row.value !== '') return row;
        mutated = true;
        return { ...row, value: onlyName };
      });
      return mutated ? next : prev;
    });
    // `setRows` is stable; `layoutNames` identity is memoised on
    // its contents by `LayoutNamesProvider`, so this only re-runs
    // when the host genuinely registers / unregisters layouts.
  }, [layoutNames]);

  // Mirror `rows` into a ref so the snapshot closure installed
  // below can read the latest state without us having to
  // re-install the closure (and notify the parent) on every
  // keystroke.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Same trick for the layout-name set + strict flag. Both feed
  // the snapshot-time validation gate; storing them in refs lets
  // the snapshot closure stay install-once while still seeing the
  // current host configuration (in practice the values barely
  // ever change after mount, but the indirection is essentially
  // free and avoids a re-install loop).
  const layoutNamesRef = useRef(layoutNames);
  const layoutsAreStrictRef = useRef(layoutsAreStrict);
  useEffect(() => {
    layoutNamesRef.current = layoutNames;
  }, [layoutNames]);
  useEffect(() => {
    layoutsAreStrictRef.current = layoutsAreStrict;
  }, [layoutsAreStrict]);

  // Install / refresh the snapshot getter the save dialog calls.
  // Returns `undefined` (≡ "skip the frontmatter field") when
  // any complex row has a parse error or any required field is
  // empty — the workflow then keeps the on-disk bytes verbatim
  // rather than overwriting them with a broken payload.
  useEffect(() => {
    snapshotRef.current = () => {
      const current = rowsRef.current;
      if (current.some(r => r.kind === 'complex' && r.parseError !== null)) {
        return undefined;
      }
      for (const row of current) {
        if (requiredSet.has(row.key) && rowIsEmpty(row)) return undefined;
      }
      // Strict-mode refusal: when the host configured
      // `<LayoutNamesProvider strict>`, an unknown `layout` value
      // blocks the snapshot — same gate as a parse error or empty
      // required field. Soft (default) mode warns inline but
      // still serialises so authors can land a new layout name
      // ahead of a registry release.
      const names = layoutNamesRef.current;
      if (layoutsAreStrictRef.current && names && names.length > 0) {
        for (const row of current) {
          if (
            row.kind === 'string' &&
            row.key === 'layout' &&
            row.value !== '' &&
            !names.includes(row.value)
          ) {
            return undefined;
          }
        }
      }
      return serialiseRows(current);
    };
    return () => {
      // Clear on unmount so a stale getter can't return
      // frontmatter from a previous page if the dialog races a
      // re-mount.
      if (snapshotRef.current) snapshotRef.current = null;
    };
  }, [snapshotRef, requiredSet]);

  // Baseline YAML for the dialog's "did anything change?" check.
  // Must match the `useState` seed exactly, otherwise the form
  // would render as dirty on first paint for any page missing a
  // required field.
  useEffect(() => {
    originalYamlRef.current = serialiseRows(seedRows(initial, requiredKeys));
  }, [initial, originalYamlRef, requiredKeys]);

  const updateRow = useCallback((index: number, next: Row) => {
    setRows(prev => prev.map((r, i) => (i === index ? next : r)));
  }, []);

  const removeRow = useCallback(
    (index: number) => {
      setRows(prev => {
        const target = prev[index];
        // Required rows render no remove button, but re-check
        // here so a future keyboard shortcut can't bypass it.
        if (target && requiredSet.has(target.key)) return prev;
        return prev.filter((_, i) => i !== index);
      });
    },
    [requiredSet]
  );

  const addRow = useCallback(() => {
    const key = newKey.trim();
    if (!key) return;
    if (rowsRef.current.some(r => r.key === key)) return;
    setRows(prev => [...prev, { kind: 'string', key, value: '' }]);
    setNewKey('');
  }, [newKey]);

  const isDirty = useMemo(() => {
    const current = serialiseRows(rows);
    return current !== originalYamlRef.current;
    // originalYamlRef read via .current intentionally — refs
    // don't notify, and `rows` already triggers re-evaluation.
  }, [rows, originalYamlRef]);

  return (
    <div className={style.root}>
      <Banner status="info" className={style.banner}>
        <BannerContent role="note">
          <Text>
            You&rsquo;re editing the authored frontmatter from your source file. Changes here will
            be saved alongside the body when you raise a Pull Request.
          </Text>
        </BannerContent>
      </Banner>

      <div className={style.sourceLabel} aria-hidden>
        {pillLabel}
        {isDirty ? <span className={style.dirtyDot}> · unsaved changes</span> : null}
      </div>

      <div className={style.form}>
        {rows.length === 0 ? (
          <Text className={style.empty}>
            No frontmatter on this page yet. Add a field below to get started.
          </Text>
        ) : (
          rows.map((row, index) => (
            <RowEditor
              key={`${row.key}-${index}`}
              row={row}
              required={requiredSet.has(row.key)}
              onChange={next => updateRow(index, next)}
              onRemove={() => removeRow(index)}
            />
          ))
        )}

        <div className={style.addRow}>
          <Input
            value={newKey}
            onChange={e => setNewKey((e.target as HTMLInputElement).value)}
            placeholder="New field name (e.g. title, tags, layout)"
            className={style.addInput}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRow();
              }
            }}
          />
          <Button className={style.addField} onClick={addRow} disabled={!newKey.trim()}>
            Add field
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Per-row UI. Splits on `row.kind` rather than dispatching to
 * sub-components per type — there's only a handful of kinds and
 * keeping them inline makes the form layout decisions (label
 * placement, remove-button positioning) trivially uniform.
 */
const RowEditor = ({
  row,
  required,
  onChange,
  onRemove
}: {
  row: Row;
  /**
   * Whether this field is in the editor's required-keys set.
   * Drives the `necessity="required"` hint, the
   * remove-button-omission, and the empty-value inline error.
   */
  required: boolean;
  onChange: (next: Row) => void;
  onRemove: () => void;
}) => {
  // Required + currently empty → surface a clear inline error so
  // the user knows why the save dialog won't accept their
  // changes. Computed inline rather than lifted out because it's
  // cheap and the row already re-renders on every value change.
  const requiredEmpty = required && rowIsEmpty(row);
  const parseError = row.kind === 'complex' ? row.parseError : null;

  // Soft warning for the `layout` field when the value isn't in
  // the host's registered set. By default the save still proceeds
  // — Mosaic's `LayoutProvider` falls back to the default layout
  // at render time when a name doesn't resolve, so this is
  // informational ("you'll probably get the wrong layout") rather
  // than blocking. Hosts that opted into `strict` mode on
  // `<LayoutNamesProvider>` escalate this to a hard error: the
  // field renders red and the snapshot getter refuses to serialise
  // so the save dialog won't ship the frontmatter slice.
  //
  // Gated on the host having opted into the registry at all
  // (`useLayoutNames() !== null`) so plain-text mode for hosts
  // without a provider stays untouched. Empty value is left to
  // the required-key check above — surfacing both at once would
  // be redundant noise.
  const layoutNames = useLayoutNames();
  const layoutsAreStrict = useLayoutsAreStrict();
  const layoutUnknown =
    row.kind === 'string' &&
    row.key === 'layout' &&
    row.value !== '' &&
    layoutNames !== null &&
    layoutNames.length > 0 &&
    !layoutNames.includes(row.value);

  const validationStatus =
    parseError || requiredEmpty || (layoutUnknown && layoutsAreStrict)
      ? 'error'
      : layoutUnknown
      ? 'warning'
      : undefined;
  const helperText = parseError
    ? `YAML error: ${parseError}`
    : requiredEmpty
    ? `${row.key} is required — frontmatter changes won’t be saved until this field has a value.`
    : layoutUnknown
    ? layoutsAreStrict
      ? `Unknown layout — pick one of: ${layoutNames!.join(', ')}.`
      : `Unknown layout — the page will fall back to the default layout when it renders. Known layouts: ${layoutNames!.join(
          ', '
        )}.`
    : undefined;

  return (
    <div className={style.row}>
      {/*
        Salt's `FormField` owns the label + necessity hint +
        helper text composition (and the a11y wiring between
        them — `aria-describedby`, error-status announcements
        etc.). We let it do that work and place the remove
        button as an absolutely-positioned sibling so it sits
        in the row's top-right corner without disrupting the
        FormField's internal vertical rhythm.
      */}
      <FormField
        // Only annotate required fields. Salt's "Optional" hint
        // is useful in registration-style forms where every
        // field is potentially fillable; here most fields are
        // free-form metadata where "optional" reads as noise.
        // Omitting the prop falls back to Salt's no-hint
        // default.
        {...(required ? { necessity: 'required' as const } : {})}
        validationStatus={validationStatus}
        className={style.formField}
      >
        <FormFieldLabel>{row.key}</FormFieldLabel>
        <RowWidget row={row} onChange={onChange} />
        {helperText ? <FormFieldHelperText>{helperText}</FormFieldHelperText> : null}
      </FormField>
      {/*
        Required rows don't render a remove button at all (rather
        than a disabled one). An empty affordance reads as
        "broken" more often than as "constrained", and the
        FormField's necessity hint already conveys why the field
        can't be deleted.
      */}
      {required ? null : (
        <Tooltip content={`Remove ${row.key}`}>
          <Button
            appearance="transparent"
            sentiment="negative"
            onClick={onRemove}
            aria-label={`Remove field ${row.key}`}
            className={style.removeButton}
          >
            ×
          </Button>
        </Tooltip>
      )}
    </div>
  );
};

/**
 * Renders the input control for a single row, dispatched on
 * `row.kind`. Split out of `RowEditor` so the FormField wrapping
 * (label, helper text, validation status) stays readable rather
 * than nesting a five-way ternary in the middle of the JSX.
 *
 * Per-key overrides
 * -----------------
 * Special-cases the `layout` key when the host has registered
 * layout names via `<LayoutNamesProvider>`: instead of a free-text
 * input, we render a ComboBox seeded with the known names. The
 * combobox is intentionally free-text-accepting — authors who add
 * a new layout to their host BEFORE updating this registry can
 * still type the new name and have it land in the saved
 * frontmatter without a release of this plugin.
 *
 * The picker only kicks in for `kind === 'string'` rows. A
 * `complex` row whose key happens to be `layout` (i.e. an author
 * stuffed an object into the field) stays on the YAML island,
 * because surfacing it as a single-line picker would silently
 * drop the structured value.
 */
const RowWidget = ({ row, onChange }: { row: Row; onChange: (next: Row) => void }) => {
  const id = `fm-${row.key}`;
  const layoutNames = useLayoutNames();

  // Per-key override: layout dropdown. Gated on the host
  // actually mounting `<LayoutNamesProvider>` (`!== null`) so
  // integrations that haven't opted in keep the original
  // free-text input behaviour. Empty list (`length === 0`) means
  // the host opted in but registered nothing — still render the
  // picker (consistent UX), the dropdown is just empty and
  // authors type the layout name in directly.
  if (row.kind === 'string' && row.key === 'layout' && layoutNames !== null) {
    return (
      <ComboBox
        id={id}
        value={row.value}
        // Salt's ComboBox highlights the matching `Option` when
        // the current `value` is a known name. We pass an
        // explicit `selected` array (rather than relying on
        // ComboBox's internal selection state) so the highlight
        // stays in sync with `value` even after a programmatic
        // edit (e.g. the parent reseeds the form).
        selected={layoutNames.includes(row.value) ? [row.value] : []}
        onChange={e => onChange({ ...row, value: (e.target as HTMLInputElement).value })}
        onSelectionChange={(_e: SyntheticEvent, selected: string[]) => {
          const next = selected[0];
          if (typeof next === 'string') onChange({ ...row, value: next });
        }}
        // Free-text fallback hint — guides authors towards
        // typing a name when the dropdown is empty (host opted
        // in but no layouts registered) or when adding a new
        // layout name not yet in the registry.
        placeholder={layoutNames.length > 0 ? layoutNames[0] : 'DetailTechnical'}
        spellCheck={false}
      >
        {layoutNames.map(name => (
          <Option value={name} key={name}>
            {name}
          </Option>
        ))}
      </ComboBox>
    );
  }

  switch (row.kind) {
    case 'string':
      return isMultilineString(row.value) ? (
        <textarea
          id={id}
          className={style.textarea}
          value={row.value}
          onChange={e => onChange({ ...row, value: e.target.value })}
          rows={Math.min(8, Math.max(2, row.value.split('\n').length))}
        />
      ) : (
        <Input
          id={id}
          value={row.value}
          onChange={e => onChange({ ...row, value: (e.target as HTMLInputElement).value })}
        />
      );
    case 'number':
      return (
        <Input
          id={id}
          value={row.value}
          inputMode="numeric"
          onChange={e => onChange({ ...row, value: (e.target as HTMLInputElement).value })}
        />
      );
    case 'boolean':
      return (
        <Switch
          id={id}
          checked={row.value}
          onChange={e => onChange({ ...row, value: (e.target as HTMLInputElement).checked })}
          label={row.value ? 'true' : 'false'}
        />
      );
    case 'tags':
      return (
        <Input
          id={id}
          value={row.value.join(', ')}
          onChange={e =>
            onChange({
              ...row,
              value: (e.target as HTMLInputElement).value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            })
          }
          placeholder="comma, separated, values"
        />
      );
    case 'complex':
      return (
        <textarea
          id={id}
          className={`${style.textarea} ${style.complexTextarea}`}
          value={row.yaml}
          onChange={e => onChange(applyComplexYamlEdit(row, e.target.value))}
          rows={Math.min(12, Math.max(3, row.yaml.split('\n').length))}
          spellCheck={false}
        />
      );
  }
};
