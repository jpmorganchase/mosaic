import React from 'react';
import { useNextPrev } from '@jpmorganchase/mosaic-store';

export const withNextPrevAdapter =
  Component =>
  ({ linkSuffix }) => {
    const { next, prev } = useNextPrev();
    return <Component linkSuffix={linkSuffix} next={next} prev={prev} />;
  };
