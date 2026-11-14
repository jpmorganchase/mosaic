import { useEffect, useState, useTransition } from 'react';
import type { WorkflowDefaults, WorkflowDefaultsInput } from '@jpmorganchase/mosaic-types';
import {
  normalizeCommitMessage,
  validateCommitMessage
} from '@jpmorganchase/mosaic-schemas/commitMessage';

interface MessageState {
  document: string;
  resolvedFor?: string;
  defaults?: WorkflowDefaults;
  override?: string;
  error?: string;
}

/** Document-scoped draft; the dialog stays mounted across mode changes and close/reopen. */
export function useCommitMessage({
  open,
  route,
  targetRoute,
  isNewPage,
  loadDefaults
}: WorkflowDefaultsInput & {
  open: boolean;
  loadDefaults?: (input: WorkflowDefaultsInput) => Promise<WorkflowDefaults>;
}) {
  const document = JSON.stringify([route, isNewPage]);
  const request = JSON.stringify([document, targetRoute]);
  const [state, setState] = useState<MessageState>({ document });
  const [refresh, setRefresh] = useState(0);
  const [, startTransition] = useTransition();
  const current = state.document === document ? state : { document };

  useEffect(() => {
    if (!open || !loadDefaults || !route) return undefined;
    let active = true;
    setState(previous => ({
      ...(previous.document === document ? previous : { document }),
      resolvedFor: undefined,
      error: undefined
    }));
    // Typing a rename should not queue one Server Action per character.
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const defaults = await loadDefaults({
            route,
            ...(targetRoute ? { targetRoute } : {}),
            ...(isNewPage ? { isNewPage: true } : {})
          });
          if (active)
            setState(previous => ({
              ...(previous.document === document ? previous : { document }),
              resolvedFor: request,
              defaults,
              error: undefined
            }));
        } catch {
          if (active)
            setState(previous => ({
              ...(previous.document === document ? previous : { document }),
              resolvedFor: request,
              error: 'Could not load the commit message. Try again.'
            }));
        }
      });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, route, targetRoute, isNewPage, loadDefaults, document, request, refresh]);

  const supported = current.defaults?.supportsCommitMessage === true;
  const value =
    current.override ??
    (current.defaults?.supportsCommitMessage ? current.defaults.commitMessage : '');
  const loading = !!loadDefaults && current.resolvedFor !== request;
  const error = current.error ?? (supported ? validateCommitMessage(value) : null);
  const reset = () => setState({ document });
  return {
    supported,
    value,
    loading,
    error,
    loadError: !!current.error,
    blocked: !!loadDefaults && (loading || !!error),
    valueToSubmit: supported ? normalizeCommitMessage(value) : undefined,
    edit: (override: string) =>
      setState(previous => ({
        ...(previous.document === document ? previous : { document }),
        override
      })),
    useDefault: () => setState(previous => ({ ...previous, override: undefined })),
    retry: () => {
      setState(previous => ({ ...previous, resolvedFor: undefined, error: undefined }));
      setRefresh(value => value + 1);
    },
    reset
  };
}
