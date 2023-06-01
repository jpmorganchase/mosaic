'use client';
import { useState, useLayoutEffect, useEffect } from 'react';
import { breakpoint as breakpoints } from '@jpmorganchase/mosaic-theme';

import { useSize } from './useSize';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('mobile');

  const size = useSize();

  useIsomorphicLayoutEffect(() => {
    let currentBreakpoint = 'desktop';
    if (size.width < breakpoints.desktop) {
      currentBreakpoint = 'web';
    }
    if (size.width < breakpoints.web) {
      currentBreakpoint = 'tablet';
    }
    if (size.width < breakpoints.tablet) {
      currentBreakpoint = 'mobile';
    }
    setBreakpoint(currentBreakpoint);
  }, [size.width]);

  return breakpoint;
};
