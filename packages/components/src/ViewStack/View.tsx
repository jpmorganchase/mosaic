import { ReactElement } from 'react';

export type ViewProps<T> = (ViewPropsWithoutId<T> | ViewPropsWithId<T>) & {
  children: ReactElement;
};

type ViewPropsWithId<T> = {
  defaultView?: boolean;
  id: T;
};

type ViewPropsWithoutId<T> = {
  defaultView: boolean;
  id?: T;
};

export function View<T>({ children }: ViewProps<T>) {
  return children;
}
