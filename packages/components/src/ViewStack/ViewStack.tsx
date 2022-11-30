import React, { ReactElement, useEffect } from 'react';
import warning from 'warning';
import { useMemoOne } from 'use-memo-one';

import { View } from './View';
import type { ViewProps } from './View';

export type ViewStackProps<T> = {
  children: ReactElement<ViewProps<T>> | ReactElement<ViewProps<T>>[];
  currentViewId?: T;
  className?: string;
};

export function ViewStack<T>({ children, currentViewId }: ViewStackProps<T>) {
  let defaultView: ReactElement | null = null;
  const childrenArray = useMemoOne(
    () => React.Children.toArray(children) as ReactElement<ViewProps<T>>[],
    [children]
  );

  useEffect(() => {
    warning(!!childrenArray.length, 'No `View` elements defined inside `ViewStack`.');
  }, [childrenArray]);

  for (let i = 0; i < childrenArray.length; i++) {
    const child: ReactElement<ViewProps<T>> = childrenArray[i];

    if (!React.isValidElement<ViewProps<T>>(child)) {
      // TODO refactor opportunity
      // eslint-disable-next-line no-continue
      continue;
    }

    if (child.props.id === currentViewId) {
      return child;
    }

    if (child.props.defaultView) {
      warning(!defaultView, 'Multiple Views with the `defaultView` prop found.');

      defaultView = child;
    }
  }
  defaultView = !defaultView && childrenArray?.length ? childrenArray[0] : defaultView;
  warning(defaultView, `No view found for '${currentViewId}' and \`defaultView\` was not defined.`);

  return defaultView;
}

ViewStack.View = View;
