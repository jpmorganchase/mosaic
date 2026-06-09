'use client';

import { useEffect, useRef, useState } from 'react';
import { Banner, BannerContent, Button, StackLayout, Text } from '@salt-ds/core';

import { useErrorMessage } from '../EditorContext';
import { invokeFocusErrorHandle } from '../utils/focusErrorRegistry';

/**
 * Renders compile errors from `PreviewPlugin` in a structured,
 * dismissable banner. Shows:
 *  - a one-line headline (cleaned-up MDX error message + Ln/Col)
 *    rendered as a button when we have a line number, so clicking it
 *    scrolls / focuses the offending block in the editor
 *  - an optional plain-English hint for common authoring mistakes
 *  - a "Show details" disclosure for the raw compiler output
 *  - a Dismiss button (UI-only; the next compile error replaces the
 *    banner state anyway)
 *
 * The preview pane keeps showing the last successful render while the
 * banner is up, so the user always has visual context while fixing
 * the broken markup.
 *
 * Dismiss semantics
 * -----------------
 * Dismiss only hides this banner; it does NOT clear the underlying
 * error context. That keeps the editor's red squiggle on the
 * offending block (the error still exists — the doc still won't
 * compile) and lets the user choose to triage later without losing
 * the visual marker. A subsequent compile that produces a *different*
 * error (different message / line / column) re-shows the banner
 * automatically; an identical error stays dismissed until the user
 * actually fixes the markdown.
 */
const StatusBanner = () => {
  const { error } = useErrorMessage();
  const [showDetails, setShowDetails] = useState(false);
  // Signature of the most-recently dismissed error. Compared against
  // each new `error` to decide whether the banner should re-appear.
  // We key on message + line + column rather than object identity
  // because a fresh compile produces a new error object even when
  // the actual problem is unchanged.
  const dismissedSig = useRef<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const errorSig = error ? `${error.message}::${error.line ?? ''}::${error.column ?? ''}` : null;

  // When the error changes (or clears), undismiss so the new error
  // gets a fresh chance to show. If the new error has the same
  // signature as the last dismissed one, stay dismissed.
  useEffect(() => {
    if (errorSig == null) {
      // Compile succeeded — reset dismissal so the next failure
      // shows up normally.
      dismissedSig.current = null;
      setIsDismissed(false);
      return;
    }
    if (errorSig !== dismissedSig.current) {
      setIsDismissed(false);
    }
  }, [errorSig]);

  if (!error || isDismissed) return null;

  const location =
    error.line !== undefined
      ? ` (Ln ${error.line}${error.column !== undefined ? `, Col ${error.column}` : ''})`
      : '';

  // The handle is registered by ErrorHighlightPlugin once it knows
  // which DOM element to focus. If it isn't registered (line wasn't
  // mappable, plugin not mounted yet) the click is a no-op rather than
  // an error — clicking can't make anything worse than the current state.
  const handleJump = () => {
    invokeFocusErrorHandle();
  };

  const handleDismiss = () => {
    dismissedSig.current = errorSig;
    setIsDismissed(true);
  };

  const canJump = error.line !== undefined;
  const headline = `MDX compile error${location}: ${error.message}`;

  return (
    <Banner status="error">
      <BannerContent role="status">
        <StackLayout gap={1}>
          <Text>
            <strong>{headline}</strong>
          </Text>
          {error.hint && <Text>{error.hint}</Text>}
          {error.raw && error.raw !== error.message && (
            <div>
              <Button
                appearance="transparent"
                sentiment="neutral"
                onClick={() => setShowDetails(v => !v)}
                aria-expanded={showDetails}
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </Button>
              {showDetails && (
                <pre
                  style={{
                    marginTop: 4,
                    padding: 8,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 4
                  }}
                >
                  {error.raw}
                </pre>
              )}
            </div>
          )}
          <div>
            {canJump && (
              <Button appearance="transparent" sentiment="neutral" onClick={handleJump}>
                Jump to error
              </Button>
            )}
            <Button
              appearance="transparent"
              sentiment="neutral"
              onClick={handleDismiss}
              aria-label="Dismiss error banner"
            >
              Dismiss
            </Button>
          </div>
        </StackLayout>
      </BannerContent>
    </Banner>
  );
};

export default StatusBanner;
