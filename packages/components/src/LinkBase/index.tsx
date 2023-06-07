import React, { forwardRef, Ref } from 'react';
import { useLinkComponent } from '@jpmorganchase/mosaic-store';

import { hasProtocol } from '../utils/hasProtocol';

export interface LinkBaseProps extends Omit<React.HTMLProps<HTMLAnchorElement>, 'ref'> {
  /** Children */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
}

export const LinkBase = forwardRef<HTMLAnchorElement, LinkBaseProps>(
  (props, ref: Ref<HTMLAnchorElement>) => {
    const { children, href, ...rest } = props;
    const LinkComponent = useLinkComponent();
    const isInternal = !hasProtocol(href);

    return (
      <LinkComponent
        href={href}
        ref={ref}
        role="link"
        {...rest}
        target={!rest.target && !isInternal ? '_blank' : rest.target}
        rel={!rest.rel && !isInternal ? 'noopener noreferrer' : rest.rel}
      >
        {children}
      </LinkComponent>
    );
  }
);
