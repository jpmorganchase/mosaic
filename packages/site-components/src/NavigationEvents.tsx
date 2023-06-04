'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationEvents({ onRouteChange }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    console.log(url);
    onRouteChange(url);
  }, [onRouteChange, pathname, searchParams]);

  return null;
}
