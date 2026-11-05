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
    const handleClick = (event: MouseEvent) => {
      // `composedPath()` is fixed when the click is dispatched. A click on
      // an element that the click itself removed (such as a trigger icon
      // that is swapped out once the drawer opens) is then still inside
      // its ancestors, whereas `contains()` would see a detached node.
      const path = event.composedPath();
      const isOutside = (element: HTMLElement | null | undefined) =>
        !!element && (element === event.target || !path.includes(element));
      if (isOutside(triggerRef?.current) && isOutside(ref.current)) {
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
