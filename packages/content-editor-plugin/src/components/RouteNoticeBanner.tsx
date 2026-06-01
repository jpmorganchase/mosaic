'use client';

/**
 * Surfaces transient navigation-derived notices that the server set
 * via querystring flags. Currently:
 *
 *   - `?existed=1` — set by `app/[...route]/page.tsx` when a
 *     `?new=1` request hit a route that already exists on disk.
 *     The server bounced the user into edit mode on the real
 *     page; without this banner the redirect is silent and
 *     potentially confusing ("I asked to create /foo/bar but
 *     I'm looking at the existing one").
 *
 * Dismissable per session: clicking Dismiss strips the flag from
 * the URL (via `router.replace`) so a reload won't re-show it.
 * The banner intentionally has no "auto-dismiss after N seconds"
 * — the user paid the navigation cost, they get to read the
 * explanation at their own pace.
 *
 * No portal / global slot — rendered inline at the top of the
 * editor, above the toolbar, so it shares the editor's visual
 * scope. A site-wide notification toast would be over-engineering
 * for what's currently a one-flag system.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Banner, BannerContent, Button, StackLayout, Text } from '@salt-ds/core';

const RouteNoticeBanner = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const existed = params.get('existed') === '1';

  // Local dismissal flag so the banner can be hidden without
  // navigating (the URL strip happens lazily — see `handleDismiss`).
  // Resets when the underlying flag goes away (e.g. the user
  // navigated to a different page that doesn't carry it).
  const [isDismissed, setIsDismissed] = useState(false);
  useEffect(() => {
    if (!existed) setIsDismissed(false);
  }, [existed]);

  if (!existed || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    // Strip the flag from the URL so a reload doesn't re-show
    // the banner. Read the live search string at click time
    // rather than capturing `params` to avoid a stale closure
    // re-instating the flag we just removed.
    const next = new URLSearchParams(window.location.search);
    next.delete('existed');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Banner status="info">
      <BannerContent role="status">
        <StackLayout gap={1}>
          <Text>
            <strong>This page already exists.</strong> You requested a new page but a file at this
            route is already on disk, so we&apos;ve opened it in the editor instead. To create a
            different page, cancel out and pick a new filename.
          </Text>
          <div>
            <Button
              appearance="transparent"
              sentiment="neutral"
              onClick={handleDismiss}
              aria-label="Dismiss notice"
            >
              Dismiss
            </Button>
          </div>
        </StackLayout>
      </BannerContent>
    </Banner>
  );
};

export default RouteNoticeBanner;
