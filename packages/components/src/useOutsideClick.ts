'use client';
import { RefObject, useEffect, useRef } from 'react';
export const useOutsideClick: (
  triggerRef: RefObject<HTMLDivElement>,
  callback: () => void
) => RefObject<HTMLDivElement> = (triggerRef, callback) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = event => {
      const hasClickedOutsideTrigger =
        triggerRef?.current === event.target ||
        (triggerRef?.current?.contains && !triggerRef.current.contains(event.target));
      const hasClickedOutsideRef =
        ref?.current === event.target ||
        (ref?.current?.contains && !ref.current.contains(event.target));
      if (hasClickedOutsideTrigger && hasClickedOutsideRef) {
        callback();
      }
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [ref]);
  return ref;
};
