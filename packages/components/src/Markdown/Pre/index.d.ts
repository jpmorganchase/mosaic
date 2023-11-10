import React from 'react';
import type { Language } from 'prism-react-renderer';
export declare type CodeBlockPropsType = {
  components?: Record<string, unknown>;
};
export declare type CodeBlockMeta = {
  code?: string;
  filename?: string;
  language?: Language;
  live?: boolean;
};
export declare type PreProps = CodeBlockMeta &
  React.HTMLProps<HTMLDivElement> & {
    CodeBlockProps?: CodeBlockPropsType;
  };
/**
 * Supported syntax:
 *
 * ```jsx live
 * <div>I will be live editable!</div>
 * ```
 */
export declare const Pre: React.FC<React.PropsWithChildren<PreProps>>;
