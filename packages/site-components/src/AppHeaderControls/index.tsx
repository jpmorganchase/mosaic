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
import { useSession } from 'next-auth/react';

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
          window.location.href = '/api/auth/signout';
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
            <Link href="/api/auth/signin" variant="component">
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
