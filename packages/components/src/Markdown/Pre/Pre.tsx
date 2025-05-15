import { Button, useIsomorphicLayoutEffect } from '@salt-ds/core';
import { CopyIcon } from '@salt-ds/icons';
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
}

export const Pre = forwardRef<HTMLDivElement, PreProps>(function Pre(
  { language: languageProp, code: codeProp = '', children, className },
  ref
) {
  let code: string | undefined = codeProp.replace(/<br>/g, '\n');
  let language: string | undefined = languageProp;
  if (isValidElement<{ className?: string; children: string }>(children)) {
    const codeBlock = children.props;
    code = codeBlock.children;
    language = codeBlock.className ? codeBlock.className.replace('language-', '') : '';
  }

  const divRef = useRef<HTMLDivElement>(null);
  const handleClickCopy = () => {
    if (divRef.current?.textContent) {
      navigator.clipboard.writeText(divRef.current.textContent).catch(() => {});
    }
  };

  const trimmedCode = code?.replace(/\n+$/, '') ?? '';

  const [html, setHtml] = useState<string>('');

  useIsomorphicLayoutEffect(() => {
    async function format() {
      // @ts-ignore
      const { codeToHtml } = await import('shiki');

      const html = await codeToHtml(trimmedCode, {
        lang: language ?? 'text',
        themes: {
          light: 'github-light',
          dark: 'github-dark'
        },
        defaultColor: false
      });

      setHtml(html);
    }

    format();
  }, [trimmedCode, language]);

  return (
    <div className={clsx(className, styles.pre)} ref={ref}>
      <Button
        aria-label="Copy code"
        sentiment="neutral"
        appearance="transparent"
        className={styles.copyButton}
        onClick={handleClickCopy}
      >
        <CopyIcon aria-hidden />
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
