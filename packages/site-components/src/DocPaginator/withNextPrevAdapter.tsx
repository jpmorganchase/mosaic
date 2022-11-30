import React from 'react';
import { useNextPrev } from '@dpmosaic/site-store';

export const withNextPrevAdapter =
  Component =>
  ({ linkSuffix }) => {
    const { next, prev } = useNextPrev();
    return <Component linkSuffix={linkSuffix} next={next} prev={prev} />;
  };
