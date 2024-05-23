import React, { AriaAttributes, ForwardedRef, MouseEvent, ReactElement } from 'react';
import { ComponentPropsWithoutRef, forwardRef, MouseEventHandler } from 'react';
import { makePrefixer } from '@salt-ds/core';
import { clsx } from 'clsx';
import { ExpansionIcon } from './ExpansionIcon';

import { useWindow } from '@salt-ds/window';
import { useComponentCssInjection } from '@salt-ds/styles';

import navigationItemCss from '@salt-ds/core/dist-es/navigation-item/NavigationItem.css.js';

type OptionalPartial<T, K extends keyof T> = Partial<Pick<T, K>>;

export interface NavigationItemElementProps<T extends HTMLAnchorElement | HTMLButtonElement>
  extends Pick<AriaAttributes, 'aria-label' | 'aria-expanded' | 'aria-current'> {
  /**
   * Item's children.
   */
  children: ReactElement;
  /**
   * Item's className.
   */
  className: string;
  /**
   * Handler to expand groups.
   */
  onClick?: MouseEventHandler<T>;
}

export interface NavigationItemRenderProps<T extends HTMLAnchorElement | HTMLButtonElement>
  extends OptionalPartial<NavigationItemProps, 'active' | 'expanded' | 'level' | 'orientation'> {
  /**
   * If the item to render is expandable when clicked.
   */
  isParent: boolean;
  /**
   * Props to apply to the row's element.
   */
  elementProps: NavigationItemElementProps<T>;
  /**
   * If row should load page when clicked, the corresponding href.
   */
  href?: string;
}
export interface NavigationItemProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Whether the navigation item is active.
   */
  active?: boolean;
  /**
   * Whether the nested group is collapsed and there is an active nested item within it.
   */
  blurActive?: boolean;
  /**
   * Whether the navigation item is expanded.
   */
  expanded?: boolean;
  /**
   * Level of nesting.
   */
  level?: number;
  /**
   * The orientation of the navigation item.
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Whether the navigation item is a parent with nested items.
   */
  parent?: boolean;
  /**
   * Render prop to enable customisation of navigation item element.
   */
  render?: React.FC<NavigationItemRenderProps<HTMLAnchorElement | HTMLButtonElement>>;
  /**
   * Action to be triggered when the navigation item is expanded.
   */
  onExpand?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  /**
   * Page to load, when this navigation item is selected.
   */
  href?: string;
}

const withBaseName = makePrefixer('saltNavigationItem');

// TODO Replace with latest Salt version once Salt issue closed (currently in PR)
// https://github.com/jpmorganchase/salt-ds/issues/3279
export const NavigationItem = forwardRef(function NavigationItem(
  props: NavigationItemProps,
  ref: ForwardedRef<HTMLDivElement>
) {
  const defaultRender: React.FC<
    NavigationItemRenderProps<HTMLAnchorElement | HTMLButtonElement>
  > = props => {
    const { isParent, elementProps, href } = props;
    /** Parent rows just expand and collapse and are not links */
    if (isParent || !href) {
      return <button {...elementProps} />;
    }
    return <a {...elementProps} href={href} />;
  };

  const {
    active,
    blurActive,
    render = defaultRender,
    children,
    className,
    expanded = false,
    orientation = 'horizontal',
    parent,
    level = 0,
    onExpand,
    href,
    style: styleProp,
    ...rest
  } = props;

  const targetWindow = useWindow();
  useComponentCssInjection({
    testId: 'salt-navigation-item',
    css: navigationItemCss,
    window: targetWindow
  });

  const style = {
    ...styleProp,
    '--saltNavigationItem-level': `${level}`
  };

  const isParent = !!parent;
  let elementProps: NavigationItemElementProps<HTMLAnchorElement | HTMLButtonElement> = {
    className: clsx(
      withBaseName('wrapper'),
      {
        [withBaseName('active')]: active || blurActive,
        [withBaseName('blurActive')]: blurActive,
        [withBaseName('rootItem')]: level === 0
      },
      withBaseName(orientation)
    ),
    children: (
      <>
        <span className={withBaseName('label')}>{children}</span>
        {isParent ? <ExpansionIcon expanded={expanded} orientation={orientation} /> : null}
      </>
    )
  };
  if (isParent) {
    const handleExpand = onExpand
      ? (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onExpand?.(event);
        }
      : undefined;
    elementProps = {
      ...elementProps,
      'aria-label': 'expand',
      'aria-expanded': expanded,
      onClick: handleExpand
    } as NavigationItemElementProps<HTMLButtonElement>;
  } else {
    elementProps = {
      ...elementProps,
      'aria-label': 'change page',
      'aria-current': active ? 'page' : undefined
    } as NavigationItemElementProps<HTMLAnchorElement>;
  }

  return (
    <div ref={ref} className={clsx(withBaseName(), className)} style={style} {...rest}>
      {render({
        active,
        isParent,
        href,
        expanded,
        level,
        orientation,
        elementProps
      })}
    </div>
  );
});
