import React, { useEffect, useRef, useState } from 'react';
import classnames from 'clsx';
import { Icon } from '../../Icon';

import { Link, LinkProps } from '../../Link';
import { Caption6, TypographyProps } from '../../Typography';
import styles from './index.css';

export interface AnchorHeadingProps extends React.HTMLProps<HTMLHeadingElement> {
  children: React.ReactNode[];
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
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
  };
  const handleMouseLeave = () => {
    setHovered(false);
  };
  const handleMouseClick = event => {
    const anchor = event.currentTarget.getAttribute('href');
    navigator.clipboard.writeText(`${window.location.origin}${anchor}`);
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 1000);
    event.preventDefault();
  };

  const { link } = LinkPropsProp;
  const anchorLink = link || `#${id}`;
  return (
    <div className={classnames(className, styles.root)}>
      <Link
        className={classnames(className, styles.link)}
        {...LinkPropsProp}
        endIcon="none"
        link={anchorLink}
        hovered={hovered}
        variant="heading"
        LinkBaseProps={{
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
          onClick: handleMouseClick
        }}
      >
        <Component id={id} className={styles.root} {...rest}>
          {children}
          <span className={styles.badgeContainer}>
            {!copied && hovered ? (
              <span
                aria-label="click to copy anchor link to clipboard"
                className={classnames(styles.badge, styles.badgeLink)}
              >
                <Icon className={styles.badgeIcon} name="linked" />
              </span>
            ) : null}
            {copied ? (
              <span
                aria-label="copied anchor link to clipboard"
                className={classnames(styles.badge, styles.badgeCopied)}
              >
                <Icon className={styles.badgeIcon} name="successTick" />
                <Caption6 className={styles.badgeLabel} component="span">
                  Copied
                </Caption6>
              </span>
            ) : null}
          </span>
        </Component>
      </Link>
    </div>
  );
};

export const withAnchorHeading = Component => props =>
  <AnchorHeading Component={Component} {...props} />;
