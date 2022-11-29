/** TODO replace with UITK LinkButton (or equivalent) once they create it
 * Forked from DivButton in UITK Odyssey
 * UITK have removed href support from Button as well as not added a prop to configure the root component
 * Hence, we need to fork our own copy
 */
import React, { forwardRef, KeyboardEvent, ReactElement } from 'react';
import cx from 'classnames';
import { makePrefixer } from '@jpmorganchase/uitk-core';
import { useButton } from '@jpmorganchase/uitk-core/dist-cjs/packages/core/src/button/useButton';

import { ButtonProps } from './Button';
import { LinkBase } from './LinkBase';

const withBaseName = makePrefixer('uitkButton');

export interface LinkButtonProps extends ButtonProps {
  href?: string /** href when component is a link */;
}

/** TODO replace with UITK LinkButton when they create it or allow rootComponent to be defined */
export const LinkButton = forwardRef<HTMLDivElement, ButtonProps>(function LinkButton(
  {
    children,
    className,
    disabled,
    focusableWhenDisabled,
    onKeyUp,
    onKeyDown,
    onBlur,
    onClick,
    role: roleProp,
    variant = 'primary',
    ...restProps
  },
  ref?
): ReactElement<ButtonProps> {
  const enter = 'Enter';
  const space = ' ';

  const handleKeyDownDiv = (event: KeyboardEvent<HTMLDivElement>) => {
    // for Pill component, which depends on Button
    if (
      !disabled &&
      // Don't act on children component
      event.target === event.currentTarget &&
      (event.key === enter || event.key === space)
    ) {
      // @ts-ignore
      onClick?.(event);
    }

    onKeyDown?.(event);
  };

  const { active, buttonProps } = useButton({
    disabled,
    focusableWhenDisabled,
    onKeyUp,
    onKeyDown: handleKeyDownDiv,
    onBlur,
    onClick
  });

  const {
    'aria-disabled': ariaDisabled,
    tabIndex,
    onBlur: handleBlur,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp
  } = buttonProps;

  return (
    <LinkBase
      aria-disabled={ariaDisabled}
      className={cx(withBaseName(), className, withBaseName(variant), {
        [withBaseName('disabled')]: disabled,
        [withBaseName('active')]: active
      })}
      tabIndex={tabIndex}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      // Allow an explicit null value to be passed by user to suppress role
      role={roleProp !== undefined ? roleProp : 'link'}
      {...restProps}
      ref={ref}
    >
      <span className={withBaseName('label')}>{children}</span>
    </LinkBase>
  );
});
