import { useCallback, useState, useEffect } from 'react';

const RESIZE_DEBOUNCE_RATE = 50;

export interface Size {
  width: number | undefined;
  height: number | undefined;
}

export function debounce(callback, wait) {
  let timeout;
  const debouncedFunction = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(), wait || 1);
  };
  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };
  return debouncedFunction;
}

/**
 * On first load the animated selection, aligns itself with the selected Item but
 * it's initial position can be affected by the page resizing.
 * During initial page load, we ensure the highlight does not show until the page size has stabalized.
 */
export function useWindowResize(): Size {
  const [windowSize, setWindowSize] = useState<Size>({
    width: undefined,
    height: undefined
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedHandleResize = useCallback(
    debounce(() => {
      window.removeEventListener('resize', debouncedHandleResize);
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }, RESIZE_DEBOUNCE_RATE),
    []
  );

  useEffect(() => {
    window.addEventListener('resize', debouncedHandleResize);
    debouncedHandleResize();
    return () => {
      debouncedHandleResize.cancel();
      window.removeEventListener('resize', debouncedHandleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return windowSize;
}
