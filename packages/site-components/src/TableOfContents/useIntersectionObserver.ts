import { useEffect, startTransition, useRef } from 'react';

export function useIntersectionObserver(items, setActive) {
  const isNavigating = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);
  const observeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function selectActive(nextActiveId) {
    startTransition(() => {
      setActive(nextActiveId);
    });
  }

  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (isNavigating.current) {
        return;
      }

      const visibleHeadings: IntersectionObserverEntry[] = [];

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleHeadings.push(entry);
        }
      });

      if (visibleHeadings.length === 0) {
        return;
      }

      selectActive(visibleHeadings.map(entry => entry.target.id));
    };

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '-30% 0px -30% 0px',
      threshold: 0.51
    });

    observeTimerRef.current = setTimeout(() => {
      items.forEach(item => {
        const heading = document.getElementById(item.id);
        if (heading) {
          observer.observe(heading);
        }
      });
    }, 150);

    return function cleanUpTocResizeObserver() {
      observer.disconnect();
      if (observeTimerRef.current) {
        window.clearTimeout(observeTimerRef.current);
      }
    };
  }, [items]);

  const handleObservedItemClick = () => {
    isNavigating.current = true;
    const handleScroll = () => {
      if (scrollEndTimer.current) {
        window.clearTimeout(scrollEndTimer.current);
      }

      scrollEndTimer.current = window.setTimeout(() => {
        isNavigating.current = false;
        window.removeEventListener('scroll', handleScroll);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
  };

  useEffect(
    () =>
      function cleanupScrollEndTimer() {
        if (scrollEndTimer.current) {
          window.clearTimeout(scrollEndTimer.current);
        }
      },
    []
  );

  return { handleObservedItemClick };
}
