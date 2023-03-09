import React from 'react';
import { useNavigation } from '@jpmorganchase/mosaic-store';

export const withNavigationAdapter =
  Component =>
  ({ linkSuffix = 'Page' }) => {
    const { next, prev } = useNavigation();
    return <Component linkSuffix={linkSuffix} next={next} prev={prev} />;
  };
