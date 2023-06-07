import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationEvents({ onRouteChange }) {
  const pathname = usePathname();
  const searchParams = useSearchParams() || '';

  useEffect(() => {
    const url = `${pathname}${searchParams.toString()}`;
    onRouteChange(url);
  }, [onRouteChange, pathname, searchParams]);

  return null;
}
