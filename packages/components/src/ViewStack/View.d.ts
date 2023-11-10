import { ReactElement } from 'react';
export declare type ViewProps<T> = (ViewPropsWithoutId<T> | ViewPropsWithId<T>) & {
  children: ReactElement;
};
declare type ViewPropsWithId<T> = {
  defaultView?: boolean;
  id: T;
};
declare type ViewPropsWithoutId<T> = {
  defaultView: boolean;
  id?: T;
};
export declare function View<T>({
  children
}: ViewProps<T>): ReactElement<any, string | import('react').JSXElementConstructor<any>>;
export {};
