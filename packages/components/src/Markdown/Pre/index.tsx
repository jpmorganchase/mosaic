import React, { useEffect, useState, useRef } from 'react';
import classnames from 'clsx';
import { getHighlighter } from 'shiki';

import { Icon } from '../../Icon';
import { Button } from '../../Button';
import { Link } from '../../Link';
import { ReactLive } from '../../ReactLive';
import { P2 } from '../../Typography';
import styles from './index.css';

export type CodeBlockPropsType = {
  components?: Record<string, unknown>;
};
export type CodeBlockMeta = {
  code?: string;
  filename?: string;
  language?: string;
  live?: boolean;
};

export type PreProps = CodeBlockMeta &
  React.HTMLProps<HTMLDivElement> & { CodeBlockProps?: CodeBlockPropsType };

const httpPattern = /^((http[s]?):\/\/)/;

/**
 * Supported syntax:
 *
 * ```jsx live
 * <div>I will be live editable!</div>
 * ```
 */
export const Pre: React.FC<React.PropsWithChildren<PreProps>> = ({
  children,
  className,
  code: codeProp = '',
  CodeBlockProps,
  filename,
  language: languageProp,
  live,
  ...rest
}) => {
  const preRef = useRef<HTMLPreElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
  };
  const handleMouseLeave = () => {
    setHovered(false);
  };
  const handleClickCopy = () => {
    if (preRef.current && preRef.current.textContent) {
      navigator.clipboard.writeText(preRef.current.textContent);
    }
  };

  let code: string | undefined = codeProp.replace(/<br>/g, '\n');
  let language: string | undefined = languageProp;
  if (children) {
    const codeBlock = (children as React.ReactElement<{ className?: string; children: string }>)
      .props;
    code = codeBlock.children;
    language = codeBlock.className?.replace('language-', '');
  }

  if (typeof code !== 'string') {
    return null;
  }

  let FilenameElement;
  if (!filename) {
    FilenameElement = null;
  } else if (httpPattern.test(filename)) {
    const basename = filename.substring(filename.lastIndexOf('/') + 1);
    FilenameElement = (
      <Link link={filename} variant="component">
        {basename}
      </Link>
    );
  } else {
    FilenameElement = <P2>{filename}</P2>;
  }

  // If a language other than JSX or TSX is specified, bail out
  const isLive = live && (language === 'tsx' || language === 'jsx');

  return (
    <div
      {...rest}
      className={classnames(styles.root, className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.filename}>
        {FilenameElement}
        {hovered && (
          <Button className={styles.button} onClick={handleClickCopy}>
            <Icon aria-label="Copy to clipboard" name="copy" />
          </Button>
        )}
      </div>
      <CodeBlock {...CodeBlockProps} code={code} isLive={isLive} language={language} ref={preRef} />
    </div>
  );
};

const CodeBlock = React.memo(
  React.forwardRef<
    HTMLPreElement | null,
    { isLive?: boolean; code: string; components?: Record<string, unknown>; language?: string }
  >(({ code, components, isLive = false, language = '' }, ref) => {
    const [highlightedCode, setHighlightedCode] = useState('');

    useEffect(() => {
      const highlightCode = async () => {
        const highlighter = await getHighlighter({ theme: 'nord' });
        const result = await highlighter.codeToHtml(code, language);
        setHighlightedCode(result);
      };
      highlightCode();
    }, [code, language]);

    if (isLive) {
      return (
        <ReactLive className={`language-${language}`} scope={components}>
          {code}
        </ReactLive>
      );
    }

    return (
      <pre className={classnames(styles.pre, `language-${language}`)} ref={ref}>
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    );
  })
);
