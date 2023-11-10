import React, { ReactElement } from 'react';
import type { ViewProps } from './View';
export declare type ViewStackProps<T> = {
  children: ReactElement<ViewProps<T>> | ReactElement<ViewProps<T>>[];
  currentViewId?: T;
  className?: string;
};
export declare function ViewStack<T>({
  children,
  currentViewId
}: ViewStackProps<T>): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
export declare namespace ViewStack {
  var View: typeof import('./View').View;
}
