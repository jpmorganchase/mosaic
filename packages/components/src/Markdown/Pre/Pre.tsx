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
   * first paint is already highlighted. Otherwise escaped code is rendered
   * immediately; named languages are highlighted in the browser afterwards.
   */
  html?: string;
}

interface HighlightedCodeProps {
  className?: string;
  children?: string;
  'data-mosaic-html'?: string;
  'data-mosaic-source'?: string;
}

const plainLanguages = new Set(['', 'text', 'plain', 'plaintext', 'txt']);

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

  const [highlighted, setHighlighted] = useState<{
    code: string;
    language: string | undefined;
    html: string;
  }>();
  // A newly rendered snippet must never show the previous snippet's HTML
  // while its asynchronous highlight is pending.
  const html =
    prerenderedHtml ??
    (highlighted?.code === trimmedCode && highlighted.language === language
      ? highlighted.html
      : undefined);

  useIsomorphicLayoutEffect(() => {
    if (prerenderedHtml !== undefined || plainLanguages.has(language?.toLowerCase() ?? '')) {
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

      if (!cancelled) setHighlighted({ code: trimmedCode, language, html: next });
    }

    // Unknown grammars or a failed chunk request leave the readable plain code
    // in place instead of producing an unhandled asynchronous rejection.
    void format().catch(() => {});
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
      {html !== undefined ? (
        <div
          className={styles.preCode}
          ref={divRef}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Needed for Shiki.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className={styles.preCode} ref={divRef}>
          <pre>
            <code>{trimmedCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
});
