'use client';

/**
 * Lets a signed-in author launch a brand-new page from the
 * running site — no repo clone, no local file editing. The
 * dialog collects the minimum we need to construct a route
 * plus a frontmatter title; the existing editor + save
 * pipeline handles everything else.
 *
 * Purely presentational + routing. On submit it `router.push`-es
 * to `<route>?new=1&title=<encoded>` and closes. The file isn't
 * created until the author actually clicks "Create Page" inside
 * the editor — which means (a) the URL can be shared with
 * colleagues mid-draft without any side effects, and (b) the
 * editor's confirm-on-leave guard kicks in only once there's
 * real content to lose.
 *
 * Folder validation is intentionally loose: free-text path,
 * allowing brand-new folders. The underlying git commit treats
 * new directories the same as new files, and forcing the
 * author to pick from existing folders would defeat the point
 * of the feature. We surface existing folders as combobox
 * suggestions (derived from `/sitemap.xml`) for discoverability
 * without taking away the ability to type a brand-new path.
 */
import { FC, SyntheticEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@jpmorganchase/mosaic-components';
import {
  ComboBox,
  DialogActions,
  DialogContent,
  DialogHeader,
  FormField,
  FormFieldHelperText,
  FormFieldLabel,
  Input,
  Option
} from '@salt-ds/core';

import { Dialog } from './Dialog';
import styles from './NewPageDialog.css';
import { useFolderSuggestions } from './useFolderSuggestions';

export interface NewPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Filename validation — kebab/snake/alphanumeric only, no
 * extension (we append `.mdx`). Strict because Mosaic uses
 * file-based routing, so the filename becomes the URL slug;
 * loose characters here would mean unfriendly URLs the author
 * can't undo without a follow-up rename PR.
 */
const FILENAME_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Build the VFS route the new-page dialog will hand off to the
 * editor. Normalises:
 *   - leading slash on the parent folder (required by the
 *     site's catch-all and matched by the workflow's prefix
 *     stripping);
 *   - trailing slash on the parent folder (stripped so the
 *     final join doesn't produce `//`);
 *   - the `.mdx` extension (always appended — picking the
 *     serialiser by extension is how the workflow knows how
 *     to write the file).
 */
function buildRoute(parentFolder: string, filename: string): string {
  const normalisedParent = parentFolder.replace(/\/+$/, '');
  return `${normalisedParent}/${filename}.mdx`;
}

export const NewPageDialog: FC<NewPageDialogProps> = ({ open, onOpenChange }) => {
  const router = useRouter();
  // Where the author opened the dialog from — used to pre-select
  // a contextual default parent folder so creating a sibling page
  // (the common case) takes a single keystroke (the filename).
  const pathname = usePathname();
  // `useId` so the Input <-> label association is stable across
  // re-renders without needing a global counter or random
  // strings (which would also have hydration risks).
  const parentId = useId();
  const filenameId = useId();
  const titleId = useId();

  // Start empty; the effect below pre-selects the first known
  // folder once the sitemap fetch resolves. Defaulting on mount
  // would be wrong because `useFolderSuggestions` is async — the
  // first render has `knownFolders === []` and we'd commit to an
  // empty value that the author then has to clear by hand.
  const [parentFolder, setParentFolder] = useState('');
  const [filename, setFilename] = useState('');
  const [title, setTitle] = useState('');

  // Track whether the author has interacted with the parent-folder
  // field. Once they have, we never overwrite their input — even if
  // the sitemap fetch lands later (slow network), or they edit and
  // then re-clear the field. `useRef` rather than state because the
  // flag never needs to drive a re-render; flipping it should not
  // re-fire the default-selection effect.
  const parentFolderTouched = useRef(false);

  // Fetch the namespace's folder tree on first dialog open;
  // re-opens are free (cached on the hook). A failure yields an
  // empty list and the ComboBox silently degrades to free-text.
  const { folders: knownFolders, routes: knownRoutes } = useFolderSuggestions(open);

  // Pre-select a sensible default parent folder once suggestions
  // arrive. Preference order:
  //   1. The current page's parent folder, if it's known to the
  //      sitemap. Creating a sibling page is the dominant use case
  //      ("I'm reading the configure/sources page and want to add
  //      another sources/foo page"), so this nails the right
  //      folder in one shot.
  //   2. The current page's pathname itself, if THAT is known as a
  //      folder. Triggers on index pages (the URL is `/foo` and
  //      `/foo` is a folder in its own right because children
  //      exist under it). Without this branch the author would
  //      otherwise jump to the grandparent.
  //   3. The first known folder alphabetically. Fires when the
  //      dialog is opened from a non-page route (homepage, search
  //      results, etc.) so neither (1) nor (2) match.
  // Gated on:
  //   - the dialog being open (don't mutate state while closed —
  //     it'd ship the next open with a value the author never saw
  //     us pick);
  //   - the author not having typed anything yet (`!touched`);
  //   - the field currently being empty (extra belt-and-braces
  //     for the case where state was set from elsewhere).
  useEffect(() => {
    if (!open) return;
    if (parentFolderTouched.current) return;
    if (parentFolder.length > 0) return;
    if (knownFolders.length === 0) return;
    // `pathname` from `usePathname()` is leading-`/`, no trailing
    // slash, no querystring — same shape as the entries in
    // `knownFolders`, so we can compare without normalisation.
    const currentParent = pathname.replace(/\/[^/]*$/, '');
    const preferred =
      (currentParent && knownFolders.includes(currentParent) ? currentParent : null) ??
      (knownFolders.includes(pathname) ? pathname : null) ??
      knownFolders[0];
    if (preferred) setParentFolder(preferred);
    // Intentional: this should re-run whenever `knownFolders` or
    // `pathname` changes (the fetch resolving and the author
    // navigating with the dialog mounted are both legitimate
    // triggers). Adding `parentFolder` would loop because we set
    // it inside.
  }, [open, knownFolders, pathname]);

  /**
   * Filter the suggestion list to what's contextually useful:
   *   - empty input → show everything (alphabetical);
   *   - non-empty   → substring match, case-insensitive.
   * Capped at 50 so a very large site doesn't render a giant
   * dropdown the author has to scroll.
   */
  const folderSuggestions = useMemo(() => {
    const needle = parentFolder.trim().toLowerCase();
    const filtered = needle
      ? knownFolders.filter(f => f.toLowerCase().includes(needle))
      : knownFolders;
    return filtered.slice(0, 50);
  }, [knownFolders, parentFolder]);

  // Whether the current input is a brand-new path (not in the
  // known set). When true and otherwise valid we surface a hint
  // so the author understands the folder will be created.
  const isNewFolder = useMemo(() => {
    if (!parentFolder) return false;
    return !knownFolders.includes(parentFolder);
  }, [knownFolders, parentFolder]);

  /**
   * Per-field validation. Returns `null` when the value is
   * acceptable; a human-readable string otherwise. Cheap, run
   * on every keystroke (same call as `PersistEditDialog`'s
   * rename validator — the inputs are tiny so debouncing isn't
   * worth the complexity).
   */
  const parentError = useMemo<string | null>(() => {
    if (parentFolder.length === 0) return 'Parent folder is required.';
    if (!parentFolder.startsWith('/')) return 'Parent folder must start with /.';
    // Intentional control-char range: NUL..US are illegal in POSIX/Windows
    // filenames, so we reject them up-front rather than letting the
    // workflows layer surface a less-friendly error later.
    // eslint-disable-next-line no-control-regex
    if (/[\s<>:"|?*\x00-\x1f]/.test(parentFolder)) {
      return 'Parent folder contains invalid characters.';
    }
    return null;
  }, [parentFolder]);

  const filenameError = useMemo<string | null>(() => {
    if (filename.length === 0) return 'Filename is required.';
    if (!FILENAME_RE.test(filename)) {
      return 'Filename can only contain letters, digits, hyphens, and underscores.';
    }
    if (filename.length > 100) return 'Filename is too long.';
    return null;
  }, [filename]);

  // Pre-flight collision check. The server-side branch in
  // `[...route]/page.tsx` redirects to the existing page in edit
  // mode when a `?new=1` request hits a path that already exists,
  // but bouncing the author into a different page on submit is a
  // jarring surprise. Surface the conflict in the dialog instead,
  // disable the Create button, and offer a direct path into the
  // existing page so they can choose intentionally.
  //
  // `knownRoutes` is leaf-only (no `.mdx`), and `buildRoute()`
  // produces `<parent>/<filename>.mdx`. Strip the extension before
  // comparison so the two are in the same shape.
  //
  // Empty `knownRoutes` (sitemap fetch failed or not yet
  // resolved) means we can't tell either way; default to "no
  // collision known" so the dialog stays usable. The server's
  // redirect is still a safety net in that case.
  const collidesWith = useMemo<string | null>(() => {
    if (parentError !== null || filenameError !== null) return null;
    if (knownRoutes.length === 0) return null;
    const candidate = buildRoute(parentFolder, filename).replace(/\.mdx$/, '');
    return knownRoutes.includes(candidate) ? candidate : null;
  }, [parentError, filenameError, knownRoutes, parentFolder, filename]);

  const titleError = useMemo<string | null>(() => {
    if (title.trim().length === 0) return 'Title is required.';
    return null;
  }, [title]);

  const route = useMemo(
    () =>
      parentError === null && filenameError === null ? buildRoute(parentFolder, filename) : '',
    [parentFolder, filename, parentError, filenameError]
  );

  const isValid =
    parentError === null && filenameError === null && titleError === null && collidesWith === null;

  // Reset transient state when the dialog closes so a subsequent
  // open starts from a clean slate (in particular, the touched
  // flag — otherwise the default-selection effect would be
  // permanently suppressed after the first interaction across
  // every future open of this component instance). We do NOT
  // clear the field values themselves: an author who closed the
  // dialog by accident expects to find what they had typed when
  // they reopen it, and the create flow's navigation unmounts the
  // dialog anyway so accidental state retention is bounded.
  useEffect(() => {
    if (!open) {
      parentFolderTouched.current = false;
    }
  }, [open]);

  const handleClose = () => onOpenChange(false);

  const handleCreate = () => {
    if (!isValid) return;
    // The target route doesn't exist on disk yet, so a soft
    // nav would 404 the RSC prefetch. `router.push` falls
    // through to a hard navigation when the route isn't in
    // the App Router's compiled segment tree, which is what
    // we want — the catch-all `[...route]/page.tsx` then sees
    // a fresh request and takes its `?new=1` branch.
    const target = `${route}?new=1&title=${encodeURIComponent(title.trim())}`;
    onOpenChange(false);
    router.push(target);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader header="New page" />
      <DialogContent>
        {/*
          Salt's `FormField` owns the label + necessity hint +
          helper-text + validation-status composition (plus the
          a11y wiring between them — `aria-describedby`, error
          announcements). Three near-identical rows follow; the
          variations are limited to the inner control (ComboBox
          vs Input) and the helper-text branching.

          `necessity="required"` on all three because the create
          flow can't proceed without any of them — see the
          `parentError`, `filenameError`, `titleError` memos.
          `validationStatus="error"` is conditional so the field
          only goes red after the author has interacted (an
          empty field on first open isn't a validation failure
          from the author's perspective — it's just empty).
        */}
        <FormField
          className={styles.fieldRow}
          necessity="required"
          validationStatus={parentError && parentFolder.length > 0 ? 'error' : undefined}
        >
          <FormFieldLabel>Parent folder</FormFieldLabel>
          {/*
            Salt's ComboBox is an input + suggestion list. We
            drive `value` from `parentFolder` so the field stays
            usable for brand-new paths (free-text), and update on
            both keystroke (`onChange`) and pick (`onSelectionChange`).
            `selected` is kept in sync so the highlighted item
            matches the input when the author types an exact match.
          */}
          <ComboBox
            id={parentId}
            value={parentFolder}
            selected={knownFolders.includes(parentFolder) ? [parentFolder] : []}
            // Salt's ComboBox types `onChange` on the wrapper
            // `<div>`, but the runtime event bubbles from the
            // inner `<input>`; cast to read its `value`.
            onChange={e => {
              parentFolderTouched.current = true;
              setParentFolder((e.target as HTMLInputElement).value);
            }}
            onSelectionChange={(_e: SyntheticEvent, selected: string[]) => {
              parentFolderTouched.current = true;
              const next = selected[0];
              if (typeof next === 'string') setParentFolder(next);
            }}
            // Only shown when the sitemap fetch hasn't resolved
            // (or returned an empty list). In the happy path the
            // field is pre-filled with the first known folder via
            // the effect above, so this placeholder is the
            // degraded-state hint rather than the primary cue.
            placeholder="/your-section"
            spellCheck={false}
          >
            {folderSuggestions.map(folder => (
              <Option value={folder} key={folder}>
                {folder}
              </Option>
            ))}
          </ComboBox>
          <FormFieldHelperText>
            {parentError && parentFolder.length > 0
              ? parentError
              : isNewFolder
              ? 'New folder — will be created when the page is saved.'
              : 'Pick an existing folder or type a new path. New folders are created automatically.'}
          </FormFieldHelperText>
        </FormField>

        <FormField
          className={styles.fieldRow}
          necessity="required"
          validationStatus={
            (filenameError && filename.length > 0) || collidesWith ? 'error' : undefined
          }
        >
          <FormFieldLabel>Filename</FormFieldLabel>
          <Input
            id={filenameId}
            value={filename}
            onChange={e => setFilename((e.target as HTMLInputElement).value)}
            placeholder="my-new-page"
            spellCheck={false}
          />
          <FormFieldHelperText>
            {filenameError && filename.length > 0 ? (
              filenameError
            ) : collidesWith ? (
              <>
                A page already exists at <code>{collidesWith}</code>. Pick a different filename, or{' '}
                <a href={`${collidesWith}?edit=1`}>open the existing page in the editor</a>.
              </>
            ) : (
              <>
                Letters, digits, hyphens, underscores. The <code>.mdx</code> extension is added
                automatically.
              </>
            )}
          </FormFieldHelperText>
        </FormField>

        <FormField
          className={styles.fieldRow}
          necessity="required"
          validationStatus={titleError && title.length > 0 ? 'error' : undefined}
        >
          <FormFieldLabel>Title</FormFieldLabel>
          <Input
            id={titleId}
            value={title}
            onChange={e => setTitle((e.target as HTMLInputElement).value)}
            placeholder="My New Page"
            spellCheck
          />
          <FormFieldHelperText>
            {titleError && title.length > 0 ? (
              titleError
            ) : (
              <>
                Used as the page&apos;s heading and as the frontmatter <code>title</code>.
              </>
            )}
          </FormFieldHelperText>
        </FormField>

        {/*
          Always show the URL preview, even while invalid —
          continuous feedback helps authors understand how their
          inputs compose into a route. Invalid pieces are
          rendered as placeholders so the preview never lies
          about what would actually be created.
        */}
        <div className={styles.previewRow}>
          Page URL:{' '}
          <code>
            {(parentError === null ? parentFolder.replace(/\/+$/, '') : '/…') +
              '/' +
              (filenameError === null ? filename : '…') +
              '.mdx'}
          </code>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="cta" disabled={!isValid} onClick={handleCreate}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};
