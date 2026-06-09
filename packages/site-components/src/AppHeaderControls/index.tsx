import React from 'react';
import { Icon, Link, Button } from '@jpmorganchase/mosaic-components';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '@salt-ds/core';
import { useEditMode, EditorControls } from '@jpmorganchase/mosaic-content-editor-plugin';
import {
  useColorMode,
  useSearchIndex,
  useSourceCapabilities,
  useStoreActions
} from '@jpmorganchase/mosaic-store';
import { signIn, signOut, useSession } from 'next-auth/react';

import { UserProfile } from '../UserProfile';
import { SearchInput } from '../SearchInput';
import styles from './styles.css';

type ActionMenuItem = {
  onSelect?: () => void;
  link?: string;
  title: string;
};

function toUpperFirst(str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

/**
 * Same-origin path the user should land on after auth (sign-in or
 * sign-out). Composed from `pathname + search + hash` rather than
 * `window.location.href` so it stays a relative URL — NextAuth's
 * default `redirect` callback already filters cross-origin targets,
 * but never handing it an absolute URL in the first place keeps the
 * link unambiguously local and avoids encoding a redundant
 * `https://host/` prefix into every Login/Logout request.
 *
 * SSR-safe: returns `'/'` when `window` is undefined (server render,
 * prerender, build-time page collection). Lands the user on the
 * homepage in that case — same behaviour as a bare
 * `/api/auth/signin` with no `callbackUrl`, which is the correct
 * fallback when we genuinely don't know where the click originated.
 *
 * A small guard collapses `callbackUrl` to `/` when the originating
 * page is itself under `/api/auth/*`. Otherwise a Login click from
 * the sign-in page (or a Logout from the sign-out confirmation
 * screen) would round-trip back to `/api/auth/signin?...`, which
 * looks like a redirect loop in the network panel and is never what
 * the user wanted.
 */
function getCallbackPath(): string {
  if (typeof window === 'undefined') return '/';
  const callbackPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return callbackPath.startsWith('/api/auth/') ? '/' : callbackPath;
}

/**
 * Fallback `href` for the Login link.
 *
 * The Login control is upgraded with an `onClick` that calls
 * `signIn()` from `next-auth/react` for the actual flow (which
 * handles CSRF, `basePath`, and provider-direct shortcuts) — but
 * we keep a real `href` on the `<Link>` so:
 *
 *   - Middle-click / cmd-click "open in new tab" works (an `onClick`
 *     that calls `preventDefault()` is bypassed entirely by the
 *     browser for modifier-key clicks, so the href is what the new
 *     tab follows).
 *   - The component degrades to a working hyperlink in the unlikely
 *     event JS fails to hydrate.
 *   - SSR / view-source shows a meaningful target.
 *
 * Returns the path-shaped Auth.js sign-in URL with the callback
 * encoded, mirroring exactly what `signIn(undefined, { callbackUrl })`
 * resolves to internally for the default-provider-list flow.
 */
function buildSignInFallbackHref(): string {
  return `/api/auth/signin?callbackUrl=${encodeURIComponent(getCallbackPath())}`;
}

export const AppHeaderControls: React.FC = () => {
  const colorMode = useColorMode();
  const { setColorMode } = useStoreActions();

  const { data: session } = useSession();
  const isLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGIN === 'true' || false;
  const isLoggedIn = session != null;
  const { isEditing, startEditing, stopEditing } = useEditMode();
  const { searchEnabled } = useSearchIndex();
  // Editor surfaces (toolbar + menu item) only render when the page's
  // owning source has opted in via its `capabilities.writable` flag.
  // Sources without a backing persistence workflow (e.g. local
  // folder, HTTP) leave the flag absent and the controls stay hidden.
  const { writable: isWritableSource = false } = useSourceCapabilities();

  const inverseColorMode = colorMode === 'dark' ? 'light' : 'dark';
  let actionMenuOptions: ActionMenuItem[] = [
    {
      title: `Select ${toUpperFirst(inverseColorMode)} Theme`,
      onSelect: () => setColorMode(inverseColorMode)
    }
  ];

  if (isLoggedIn && isWritableSource) {
    actionMenuOptions.push({
      title: isEditing ? 'Stop Editing' : 'Edit Document',
      onSelect: () => (isEditing ? stopEditing() : startEditing())
    });
  }
  if (isLoginEnabled && isLoggedIn) {
    actionMenuOptions = [
      ...actionMenuOptions,
      {
        title: 'Logout',
        onSelect: () => {
          // `signOut()` from `next-auth/react` handles the CSRF
          // round-trip + redirect; we just declare *where* to land.
          // `getCallbackPath()` resolves to the current page (or `/`
          // if the click came from `/api/auth/*`), so the user
          // returns to the page they signed out from instead of the
          // default-namespace homepage.
          //
          // `void` because the returned promise resolves *after* the
          // browser is already navigating away — awaiting it would
          // be a no-op that lint flags as floating.
          void signOut({ callbackUrl: getCallbackPath() });
        }
      }
    ];
  }
  return (
    <div className={styles.root}>
      {isLoginEnabled && isWritableSource && <EditorControls enabled={isLoggedIn} />}
      {searchEnabled && <SearchInput />}
      {isLoginEnabled && (
        <div className={styles.userInfo}>
          {isLoggedIn ? (
            <UserProfile
              avatarUrl={session?.user?.image || ''}
              firstName={toUpperFirst(session?.user?.name || '')}
              prefixText="Welcome, "
            />
          ) : (
            // Hybrid Login control: the `href` is the SSR-rendered
            // fallback (and the target browsers use for middle-click
            // / cmd-click "open in new tab" — those bypass `onClick`
            // entirely, so a static href is the only way to make
            // them route correctly). The `onClick` upgrades the
            // primary-click path to `signIn()` from `next-auth/react`,
            // which handles CSRF + `basePath` resolution and could
            // be extended to skip the provider-list page in
            // single-provider deployments (e.g.
            // `signIn('github', { callbackUrl })`).
            //
            // `preventDefault()` is gated on the click not being a
            // modifier-key click — `<Link>` already handles this for
            // plain hrefs, but we're attaching custom JS, so we
            // reproduce the convention explicitly: any modifier
            // (cmd, ctrl, shift, alt, middle-button) falls through
            // to the native href behaviour, primary clicks go via
            // `signIn`.
            <Link
              href={buildSignInFallbackHref()}
              onClick={event => {
                if (
                  event.defaultPrevented ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return;
                }
                event.preventDefault();
                void signIn(undefined, { callbackUrl: getCallbackPath() });
              }}
              variant="component"
            >
              Login
            </Link>
          )}
        </div>
      )}
      <Menu placement="bottom-end">
        <MenuTrigger>
          <Button aria-label="Select an action" variant="secondary">
            <Icon aria-hidden name="microMenu" />
          </Button>
        </MenuTrigger>
        <MenuPanel>
          {actionMenuOptions.map(option => (
            <MenuItem key={option.title} onClick={option.onSelect}>
              {option.title}
            </MenuItem>
          ))}
        </MenuPanel>
      </Menu>
    </div>
  );
};
