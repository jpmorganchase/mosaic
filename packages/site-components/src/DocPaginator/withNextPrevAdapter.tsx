import React from 'react';
import { useNextPrev } from '@jpmorganchase/mosaic-store';

export const withNextPrevAdapter =
  Component =>
  ({ linkSuffix = 'Page' }) => {
    const { next, prev } = useNextPrev();
    return <Component linkSuffix={linkSuffix} next={next} prev={prev} />;
  };
