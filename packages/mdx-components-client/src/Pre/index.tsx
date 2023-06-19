import React, { useEffect, useState, useRef } from 'react';
import classnames from 'clsx';
import Highlight, { defaultProps as defaultPrismProps } from 'prism-react-renderer';
import type { Language } from 'prism-react-renderer';
import { Button, Icon, Link, P2 } from '@jpmorganchase/mosaic-components';

import { ReactLive } from '../ReactLive';
import styles from './index.css';

export type CodeBlockPropsType = {
  components?: Record<string, unknown>;
};
export type CodeBlockMeta = {
  code?: string;
  filename?: string;
  language?: Language;
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
  let language: Language | undefined = languageProp;
  if (children) {
    const codeBlock = (children as React.ReactElement<{ className?: string; children: string }>)
      .props;
    code = codeBlock.children;
    language = codeBlock.className?.replace('language-', '') as Language;
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
    { isLive?: boolean; code: string; components?: Record<string, unknown>; language?: Language }
  >(({ code, components, isLive = false, language = '' }, ref) =>
    isLive ? (
      <ReactLive className={`language-${language}`} scope={components}>
        {code}
      </ReactLive>
    ) : (
      <pre className={classnames(styles.pre, `language-${language}`)} ref={ref}>
        <CodeHighlight code={code} language={language as Language} />
      </pre>
    )
  )
);

const CodeHighlight: React.FC<React.PropsWithChildren<{ code: string; language: Language }>> =
  function CodeHighlight({ code, language }) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
      setIsClient(true);
    }, []);

    if (!isClient) {
      return null;
    }
    let trimmedCode = code.replace(/\n+$/, '');
    return (
      <Highlight {...defaultPrismProps} code={trimmedCode} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <>
            {tokens.map((line, i) => (
              // eslint-disable-next-line react/jsx-key
              <div {...getLineProps({ line, key: i })} style={{}}>
                {line.map((token, key) => (
                  // eslint-disable-next-line react/jsx-key
                  <span {...getTokenProps({ token, key })} style={{}} />
                ))}
              </div>
            ))}
          </>
        )}
      </Highlight>
    );
  };
