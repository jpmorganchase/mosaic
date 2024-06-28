import React, { AriaAttributes, ForwardedRef, MouseEvent, ReactElement } from 'react';
import { ComponentPropsWithoutRef, forwardRef, MouseEventHandler } from 'react';
import { makePrefixer } from '@salt-ds/core';
import { clsx } from 'clsx';
import { ExpansionIcon } from './ExpansionIcon';

import { useWindow } from '@salt-ds/window';
import { useComponentCssInjection } from '@salt-ds/styles';

const navigationItemCss =
  '/* Vars applied to root NavigationItem component */\n.saltNavigationItem-wrapper {\n  display: flex;\n  gap: var(--salt-spacing-100);\n  align-items: center;\n  position: relative;\n  background: none;\n  border: none;\n  font-size: var(--salt-text-fontSize);\n  text-decoration: none;\n  cursor: var(--salt-selectable-cursor-hover);\n  /* Hover off animation */\n  transition: all var(--salt-duration-instant) ease-in-out;\n  box-sizing: border-box;\n}\n\n/* Vars applied to NavigationItem component when root */\n.saltNavigationItem-rootItem {\n  font-weight: var(--salt-text-fontWeight-strong);\n}\n\n/* Styles applied to NavigationItem icon */\n.saltNavigationItem-label .saltIcon {\n  top: var(--salt-spacing-25);\n}\n\n/* Styles applied when orientation = "horizontal" */\n.saltNavigationItem-horizontal {\n  min-height: calc(var(--salt-size-base) + var(--salt-spacing-100) * 2);\n  padding: 0 var(--salt-spacing-100);\n  width: fit-content;\n}\n\n/* Styles applied when orientation = "vertical" */\n.saltNavigationItem-vertical {\n  min-height: calc(var(--salt-size-base) + var(--salt-spacing-50) * 2);\n  padding-top: 0;\n  padding-bottom: 0;\n  padding-right: var(--salt-spacing-100);\n  padding-left: calc(var(--salt-spacing-300) * (min(var(--saltNavigationItem-level, 0) + 1, 2)));\n  width: 100%;\n}\n\n/* Styles applied to NavigationItem label */\n.saltNavigationItem-label {\n  color: var(--salt-content-primary-foreground);\n  line-height: var(--salt-text-lineHeight);\n  font-family: var(--salt-text-fontFamily);\n  padding-left: calc(var(--saltNavigationItem-level, 0) * var(--salt-spacing-100));\n  flex: 1;\n  text-align: left;\n  display: flex;\n  align-items: baseline;\n  gap: var(--salt-spacing-100);\n}\n\n/* Styles applied when orientation = "horizontal" */\n.saltNavigationItem-horizontal {\n  min-height: calc(var(--salt-size-base) + var(--salt-spacing-100) * 2);\n  padding: 0 var(--salt-spacing-100);\n  width: fit-content;\n}\n\n/* Styles applied when orientation = "vertical" */\n.saltNavigationItem-vertical {\n  --saltButton-margin: var(--salt-spacing-50) 0;\n\n  min-height: calc(var(--salt-size-base) + var(--salt-spacing-50) * 2);\n  padding-right: var(--salt-spacing-100);\n  padding-left: calc(var(--salt-spacing-300) * (min(var(--saltNavigationItem-level, 0) + 1, 2)));\n  width: 100%;\n}\n\n/* Styles applied to NavigationItem label */\n.saltNavigationItem-label {\n  color: var(--salt-content-primary-foreground);\n  line-height: var(--salt-text-lineHeight);\n  font-family: var(--salt-text-fontFamily);\n  padding-left: calc(var(--saltNavigationItem-level, 0) * var(--salt-spacing-100));\n  flex: 1;\n  text-align: left;\n  display: flex;\n  align-items: baseline;\n  gap: var(--salt-spacing-100);\n}\n\n/* Styles applied to NavigationItem Badge */\n.saltNavigationItem-label .saltBadge {\n  margin-left: auto;\n}\n\n/* Styles applied to NavigationItem when focus is visible */\n.saltNavigationItem-wrapper:focus-visible {\n  outline: var(--salt-focused-outline);\n}\n\n/* Styles applied to NavigationItem for non-keyboard focus */\n.saltNavigationItem-wrapper:focus:not(:focus-visible) {\n  outline: 0;\n}\n\n/* Styles applied to activation line */\n.saltNavigationItem-wrapper::after {\n  content: "";\n  position: absolute;\n  top: var(--salt-spacing-25);\n  left: 0;\n  display: block;\n}\n\n/* Styles applied to activation line when orientation = "horizontal" */\n.saltNavigationItem-horizontal::after {\n  width: 100%;\n  height: var(--salt-size-indicator);\n}\n\n/* Styles applied to activation line when orientation = "vertical" */\n.saltNavigationItem-vertical::after {\n  width: var(--salt-size-indicator);\n  left: var(--salt-spacing-25);\n  height: calc(100% - var(--salt-spacing-50));\n}\n\n/* Styles applied to activation line on hover  */\n.saltNavigationItem-wrapper:hover::after,\n.saltNavigationItem-wrapper:focus-visible::after {\n  background: var(--salt-navigable-indicator-hover);\n  /* Hover on animation */\n  transition: all var(--salt-duration-perceptible) ease-in-out;\n}\n\n/* Styles applied to activation line when item is active */\n.saltNavigationItem-active::after,\n.saltNavigationItem-active:hover::after,\n.saltNavigationItem-active:focus::after {\n  background: var(--salt-navigable-indicator-active);\n  /* Hover on animation */\n  transition: all var(--salt-duration-perceptible) ease-in-out;\n}\n';

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
