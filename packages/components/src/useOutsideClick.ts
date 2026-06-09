import { RefObject, useEffect, useRef } from 'react';
// `RefObject<T | null>` is the React-19 shape returned by
// `useRef<T>(null)`; widen the accepted parameter so callers don't
// need an `as` cast.
export const useOutsideClick: (
  triggerRef: RefObject<HTMLDivElement | null>,
  callback: () => void
) => RefObject<HTMLDivElement | null> = (triggerRef, callback) => {
  const ref = useRef<HTMLDivElement | null>(null);
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
