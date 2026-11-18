import React from 'react';
import { Icon, Link, Button } from '@jpmorganchase/mosaic-components';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '@salt-ds/core';
// Deep imports: the package root re-exports the whole Lexical editor.
import {
  useEditModeActions,
  useIsEditing
} from '@jpmorganchase/mosaic-content-editor-plugin/useEditMode';
import { EditorControls } from '@jpmorganchase/mosaic-content-editor-plugin/components/EditorControls';
import { useAuthoringSite } from '@jpmorganchase/mosaic-content-editor-plugin/authoringSite';
import { usePathname } from 'next/navigation';
import { useColorMode, useSourceCapabilities, useStoreActions } from '@jpmorganchase/mosaic-store';

import { useMosaicAuth } from '../auth';
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

export const AppHeaderControls: React.FC = () => {
  const colorMode = useColorMode();
  const { setColorMode } = useStoreActions();

  const {
    user,
    status,
    loginEnabled: isLoginEnabled,
    signInHref,
    signIn,
    signOut
  } = useMosaicAuth();
  const isLoggedIn = status === 'authenticated';
  const isEditing = useIsEditing();
  const { startEditing, stopEditing } = useEditModeActions();
  // Editor surfaces (toolbar + menu item) only render when the page's
  // owning source has opted in via its `capabilities.writable` flag.
  // Sources without a backing persistence workflow (e.g. local
  // folder, HTTP) leave the flag absent and the controls stay hidden.
  const { writable: isWritableSource = false } = useSourceCapabilities();
  // Pages on this environment are edited on another site: the controls
  // show without signing in here, and open that site.
  const authoringSite = useAuthoringSite();
  const pathname = usePathname();
  const showEditorControls = isWritableSource && (authoringSite !== undefined || isLoginEnabled);

  const inverseColorMode = colorMode === 'dark' ? 'light' : 'dark';
  let actionMenuOptions: ActionMenuItem[] = [
    {
      title: `Select ${toUpperFirst(inverseColorMode)} Theme`,
      onSelect: () => setColorMode(inverseColorMode)
    }
  ];

  if (authoringSite && isWritableSource) {
    actionMenuOptions.push({
      title: `Edit Document on ${authoringSite.host}`,
      onSelect: () => window.location.assign(authoringSite.href(`${pathname ?? '/'}?edit=1`))
    });
  } else if (isLoggedIn && isWritableSource) {
    actionMenuOptions.push({
      title: isEditing ? 'Stop Editing' : 'Edit Document',
      onSelect: () => (isEditing ? stopEditing() : startEditing())
    });
  }
  if (isLoginEnabled && isLoggedIn && signOut) {
    actionMenuOptions = [
      ...actionMenuOptions,
      {
        title: 'Logout',
        onSelect: () => {
          void signOut();
        }
      }
    ];
  }
  return (
    <div className={styles.root}>
      {showEditorControls && <EditorControls enabled={isLoggedIn} />}
      <SearchInput />
      {isLoginEnabled && (
        <div className={styles.userInfo}>
          {isLoggedIn ? (
            <UserProfile
              avatarUrl={user?.image || ''}
              firstName={toUpperFirst(user?.name || '')}
              prefixText="Welcome, "
            />
          ) : (
            signInHref && (
              <Link
                href={signInHref}
                onClick={event => {
                  if (
                    !signIn ||
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
                  void signIn();
                }}
                variant="component"
              >
                Login
              </Link>
            )
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
