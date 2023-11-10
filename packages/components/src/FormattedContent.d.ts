import React, { ReactElement } from 'react';
declare type FormattedContentProps = {
  className?: string;
  children: string;
  components?: {
    h1?: () => ReactElement;
    h2?: () => ReactElement;
    h3?: () => ReactElement;
    h4?: () => ReactElement;
    h5?: () => ReactElement;
    h6?: () => ReactElement;
    p?: () => ReactElement;
    em?: () => ReactElement;
    strong?: () => ReactElement;
    ul?: () => ReactElement;
    ol?: () => ReactElement;
    li?: () => ReactElement;
  };
};
export declare const FormattedContent: React.FC<React.PropsWithChildren<FormattedContentProps>>;
export {};
