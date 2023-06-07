import React from 'react';
import classnames from 'clsx';
import { Typography } from '@jpmorganchase/mosaic-components';
import { heading } from '@jpmorganchase/mosaic-theme';
import { AnchorHeading } from './AnchorHeading';

const createHeading =
  (variant, component) =>
  ({ children, className, ...props }) =>
    (
      <Typography
        className={classnames(heading({ variant, context: 'markdown' }), className)}
        component={component}
        role={'heading'}
        {...props}
      >
        {children}
      </Typography>
    );

const Heading0 = createHeading('heading0', 'h1');
const Heading1 = createHeading('heading1', 'h1');
const Heading2 = createHeading('heading2', 'h2');
const Heading3 = createHeading('heading3', 'h3');
const Heading4 = createHeading('heading4', 'h4');
const Heading5 = createHeading('heading5', 'h5');
const Heading6 = createHeading('heading6', 'h6');

export const H0 = props => <AnchorHeading Component={Heading0} {...props} />;
export const H1 = props => <AnchorHeading Component={Heading1} {...props} />;
export const H2 = props => <AnchorHeading Component={Heading2} {...props} />;
export const H3 = props => <AnchorHeading Component={Heading3} {...props} />;
export const H4 = props => <AnchorHeading Component={Heading4} {...props} />;
export const H5 = props => <AnchorHeading Component={Heading5} {...props} />;
export const H6 = props => <AnchorHeading Component={Heading6} {...props} />;
