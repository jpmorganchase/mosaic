import React from 'react';
declare type ReactLiveProps = {
  /** Contents */
  children: string;
  /** className determines the type of language flagged in the MD codeblock */
  className: string;
  /** Scope (including components) for live editor */
  scope?: Record<string, unknown>;
};
export declare const ReactLive: React.FC<ReactLiveProps>;
export {};
