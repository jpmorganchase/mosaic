'use client';
import React from 'react';
import classnames from 'clsx';

import { Label } from '../Label';
import styles from './styles.css';

export const MAX_LENGTH = 23;

export interface TileContentLabelProps {
  /** Additional class name for root class override */
  className?: string;
  /* List of labelled values */
  labelItems?: string[];
  /* Label name */
  labelName?: string;
}

export const ContentLabel: React.FC<React.PropsWithChildren<TileContentLabelProps>> = ({
  className,
  labelItems = [],
  labelName,
  ...rest
}) => (
  <Label className={classnames(styles.root, className, styles.labelHover)} {...rest}>
    <i>{labelName}: </i>
    {labelItems.join(', ')}
  </Label>
);

export const ContentLabelWithTooltip: React.FC<React.PropsWithChildren<TileContentLabelProps>> = ({
  className,
  labelItems = [],
  labelName,
  ...rest
}) => {
  const labelContent = labelItems.join(', ');
  const totalNumWords = labelContent.split(',').length;
  // 12 chars to account for "... + 1 more"
  const shortenedLabel = `${labelContent.substr(0, MAX_LENGTH - 12)}...`;
  const numRemaining = totalNumWords - shortenedLabel.split(',').length;

  return (
    <Label
      TooltipProps={{
        title: labelName,
        children: (
          <span className={styles.numRemaining}>{`${
            numRemaining === 0 ? '1' : numRemaining
          } more`}</span>
        )
      }}
      className={classnames(styles.root, className, styles.labelHover)}
      tooltip={labelContent.split(',').map((text, index) => (
        <span key={`${text}-${index}`}>
          {text} <br />
        </span>
      ))}
      tooltipClass={styles.tooltipContent}
      {...rest}
    >
      <i>{labelName}: </i>
      {shortenedLabel} +{' '}
    </Label>
  );
};

export const TileContentLabel: React.FC<React.PropsWithChildren<TileContentLabelProps>> = props => {
  const labelContent = props.labelItems?.join(', ') || '';
  return labelContent.length > MAX_LENGTH ? (
    <ContentLabelWithTooltip {...props} />
  ) : (
    <ContentLabel {...props} />
  );
};
