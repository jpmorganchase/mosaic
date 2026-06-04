import { useIsomorphicLayoutEffect } from '@salt-ds/core';
import { Button } from '../../Button';
import { Icon } from '../../Icon';
import { clsx } from 'clsx';
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  isValidElement,
  useRef,
  useState
} from 'react';
import styles from './Pre.module.css';

export interface PreProps extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
  code?: string;
  language?: string;
  /**
   * Server-pre-rendered HTML from the `highlightCodeBlocks` rehype
   * plugin in `@jpmorganchase/mosaic-site-middleware`. When present
   * (either via this prop or via `data-mosaic-html` on the `<code>`
   * child), the client-side `import('shiki')` path is skipped and
   * first paint is already highlighted. Absent: legacy client-side
   * highlight runs.
   */
  html?: string;
}

interface HighlightedCodeProps {
  className?: string;
  children?: string;
  'data-mosaic-html'?: string;
  'data-mosaic-source'?: string;
}

export const Pre = forwardRef<HTMLDivElement, PreProps>(function Pre(
  { language: languageProp, code: codeProp = '', children, className, html: htmlProp },
  ref
) {
  let code: string | undefined = codeProp.replace(/<br>/g, '\n');
  let language: string | undefined = languageProp;
  // Pre-rendered HTML may arrive as an explicit `html` prop or via
  // `data-mosaic-html` on the `<code>` child (the rehype-plugin path).
  // Read `data-mosaic-source` too so the copy-button gets the raw text
  // rather than the span-interleaved DOM `textContent`.
  let prerenderedHtml: string | undefined = htmlProp;
  if (isValidElement<HighlightedCodeProps>(children)) {
    const codeBlock = children.props;
    code = codeBlock['data-mosaic-source'] ?? codeBlock.children ?? code;
    language = codeBlock.className ? codeBlock.className.replace('language-', '') : language;
    if (codeBlock['data-mosaic-html']) {
      prerenderedHtml = codeBlock['data-mosaic-html'];
    }
  }

  const divRef = useRef<HTMLDivElement>(null);
  const handleClickCopy = () => {
    const text = code ?? divRef.current?.textContent ?? '';
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const trimmedCode = code?.replace(/\n+$/, '') ?? '';

  const [html, setHtml] = useState<string>(prerenderedHtml ?? '');

  useIsomorphicLayoutEffect(() => {
    if (prerenderedHtml) {
      // Adopt re-rendered pre-rendered HTML synchronously (e.g. live-
      // reload picking up an edited snippet).
      if (prerenderedHtml !== html) setHtml(prerenderedHtml);
      return;
    }

    let cancelled = false;
    async function format() {
      const { codeToHtml } = await import('shiki');

      const next = await codeToHtml(trimmedCode, {
        lang: language ?? 'text',
        themes: {
          light: 'github-light',
          dark: 'github-dark'
        },
        defaultColor: false
      });

      if (!cancelled) setHtml(next);
    }

    format();
    return () => {
      cancelled = true;
    };
  }, [prerenderedHtml, trimmedCode, language]);

  return (
    <div className={clsx(className, styles.pre)} ref={ref}>
      <Button
        aria-label="Copy code"
        sentiment="neutral"
        appearance="transparent"
        className={styles.copyButton}
        onClick={handleClickCopy}
      >
        <Icon name="copy" aria-hidden />
      </Button>
      <div
        className={styles.preCode}
        ref={divRef}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Needed for Shiki.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});
