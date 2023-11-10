import React from 'react';
import { LinkProps } from '../../Link';
import { TypographyProps } from '../../Typography';
export interface AnchorHeadingProps extends React.HTMLProps<HTMLHeadingElement> {
  children: React.ReactNode[];
  Component: React.FC<React.PropsWithChildren<TypographyProps>>;
  LinkProps?: LinkProps;
}
export declare const AnchorHeading: React.FC<React.PropsWithChildren<AnchorHeadingProps>>;
export declare const withAnchorHeading: (Component: any) => (props: any) => JSX.Element;
