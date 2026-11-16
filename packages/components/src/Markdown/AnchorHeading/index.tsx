import React, { useEffect, useRef, useState } from 'react';
import classnames from 'clsx';
import { Icon } from '../../Icon';

import { Link, LinkProps } from '../../Link';
import { Caption6, TypographyProps } from '../../Typography';
import styles from './index.css';

export interface AnchorHeadingProps extends React.HTMLProps<HTMLHeadingElement> {
  children: React.ReactNode;
  Component: React.FC<React.PropsWithChildren<TypographyProps>>;
  LinkProps?: LinkProps;
}

export const AnchorHeading: React.FC<React.PropsWithChildren<AnchorHeadingProps>> = ({
  Component,
  children,
  className,
  id,
  LinkProps: LinkPropsProp = {},
  ...rest
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const [copied, setCopied] = useState(false);

  const handleMouseClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    const onClick = LinkPropsProp.LinkBaseProps?.onClick ?? LinkPropsProp.onClick;
    onClick?.(event);
    if (event.defaultPrevented || !navigator.clipboard?.writeText) return;
    const anchor = event.currentTarget.href;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(anchor);
      if (!mountedRef.current) return;
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1000);
    } catch {
      if (mountedRef.current) setCopied(false);
    }
  };

  const anchorLink = LinkPropsProp.href ?? LinkPropsProp.link ?? `#${id}`;
  return (
    <div className={classnames(className, styles.root)}>
      <Component id={id} className={styles.heading} {...rest}>
        {children}
      </Component>
      <Link
        aria-label="Copy link to heading"
        {...LinkPropsProp}
        className={classnames(LinkPropsProp.className, styles.link, copied && styles.copied)}
        endIcon="none"
        href={anchorLink}
        variant="heading"
        LinkBaseProps={{
          ...LinkPropsProp.LinkBaseProps,
          onClick: handleMouseClick
        }}
      >
        <span className={styles.badgeContainer}>
          {copied ? (
            <span
              aria-label="copied anchor link to clipboard"
              role="status"
              className={classnames(styles.badge, styles.badgeCopied)}
            >
              <Icon className={styles.badgeIcon} name="successTick" />
              <Caption6 className={styles.badgeLabel} component="span">
                Copied
              </Caption6>
            </span>
          ) : (
            <span className={classnames(styles.badge, styles.badgeLink)} aria-hidden="true">
              <Icon className={styles.badgeIcon} name="linked" />
            </span>
          )}
        </span>
      </Link>
    </div>
  );
};

export const withAnchorHeading = Component => props =>
  <AnchorHeading Component={Component} {...props} />;
