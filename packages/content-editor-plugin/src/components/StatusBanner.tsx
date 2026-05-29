'use client';

import { useState } from 'react';
import { Banner, BannerContent, Button } from '@salt-ds/core';

import { useErrorMessage } from '../EditorContext';

/**
 * Renders compile errors from `PreviewPlugin` in a structured,
 * dismissable banner. Shows:
 *  - a one-line headline (cleaned-up MDX error message + Ln/Col)
 *  - an optional plain-English hint for common authoring mistakes
 *  - a "Show details" disclosure for the raw compiler output
 *
 * The preview pane keeps showing the last successful render while the
 * banner is up, so the user always has visual context while fixing
 * the broken markup.
 */
const StatusBanner = () => {
  const { error, setError } = useErrorMessage();
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const location =
    error.line !== undefined
      ? ` (Ln ${error.line}${error.column !== undefined ? `, Col ${error.column}` : ''})`
      : '';

  return (
    <Banner status="error">
      <BannerContent role="status">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 600 }}>
            MDX compile error{location}: {error.message}
          </div>
          {error.hint && <div style={{ opacity: 0.85 }}>{error.hint}</div>}
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
            <Button
              appearance="transparent"
              sentiment="neutral"
              onClick={() => setError(undefined)}
              aria-label="Dismiss error banner"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </BannerContent>
    </Banner>
  );
};

export default StatusBanner;
