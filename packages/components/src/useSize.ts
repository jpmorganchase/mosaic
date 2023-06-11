'use client';
import { useState, useLayoutEffect, useEffect } from 'react';
import throttle from 'lodash/throttle';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const useSize = () => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const getWidth = () =>
    window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  const getHeight = () => document.body.clientHeight;

  const getSizes = () => {
    setWidth(getWidth());
    setHeight(getHeight());
  };

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    getSizes();
    const observer = new ResizeObserver(throttle(getSizes, 200));
    observer.observe(document.body);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { width, height };
};
