import React, { useContext } from 'react';
import { Icon, ColorModeContext, Link } from '@jpmorganchase/mosaic-components';
import { MenuButton, MenuDescriptor } from '@salt-ds/lab';
import { useRouter } from 'next/router';
import { useContentEditor, EditorControls } from '@jpmorganchase/mosaic-content-editor-plugin';

import { useSession } from '../SessionProvider';
import { UserProfile } from '../UserProfile';
import styles from './styles.css';

type ActionMenuItem = {
  onSelect?: () => void;
  link?: string;
  title: string;
};

export type HeaderControlsProps = {
  searchEndpoint?: string;
};

function toUpperFirst(str) {
  return `${str.substr(0, 1).toUpperCase()}${str.toLowerCase().substr(1)}`;
}

export const AppHeaderControls: React.FC<HeaderControlsProps> = () => {
  const router = useRouter();

  const { colorMode, setColorMode } = useContext<{ colorMode; setColorMode }>(ColorModeContext);
  const { isLoggedIn, ...session } = useSession();
  const { user: { avatarUrl = '', firstName = '' } = {} } = session || {};
  const loginPath = `/api/auth/login?referrer=${encodeURIComponent(router.asPath)}`;
  const { pageState, startEditing, stopEditing } = useContentEditor();

  const inverseColorMode = colorMode === 'dark' ? 'light' : 'dark';
  let actionMenuOptions: ActionMenuItem[] = [
    {
      title: `Select ${toUpperFirst(inverseColorMode)} Theme`,
      onSelect: () => setColorMode(inverseColorMode)
    }
  ];

  if (isLoggedIn) {
    actionMenuOptions.push({
      title: pageState === 'EDIT' ? 'Stop Editing' : 'Edit Document',
      onSelect: () => {
        if (pageState !== 'EDIT') {
          startEditing();
        } else {
          stopEditing();
        }
      }
    });
  }
  if (isLoggedIn) {
    actionMenuOptions = [...actionMenuOptions, { title: 'Logout', link: '/api/auth/logout' }];
  }
  function handleMenuSelect(selectedMenuItem) {
    if (selectedMenuItem?.link) {
      if (selectedMenuItem.title.toLowerCase() === 'logout') {
        window.location.href = selectedMenuItem.link;
      } else {
        router.push(selectedMenuItem.link);
      }
    } else if (selectedMenuItem?.onSelect) {
      selectedMenuItem.onSelect();
    }
  }

  function handleLogin(event) {
    event.preventDefault();
    window.location.href = loginPath;
    return false;
  }

  const initialSource: MenuDescriptor = {
    menuItems: actionMenuOptions
  };

  return (
    <div className={styles.root}>
      <EditorControls isLoggedIn={isLoggedIn} />
      {process.env.ENABLE_LOGIN === 'true' ? (
        <div className={styles.userInfo}>
          {isLoggedIn ? (
            <UserProfile
              avatarUrl={avatarUrl}
              firstName={toUpperFirst(firstName)}
              prefixText="Welcome, "
            />
          ) : (
            // eslint-disable-next-line react/jsx-no-bind
            <Link onClick={handleLogin} variant="component">
              Login
            </Link>
          )}
        </div>
      ) : null}
      <MenuButton
        CascadingMenuProps={{
          initialSource,
          onItemClick: handleMenuSelect,
          rootPlacement: 'bottom-end'
        }}
        className={styles.menuButton}
        hideCaret
        key={`${colorMode} - ${pageState}`}
      >
        <Icon aria-label="select an action" name="microMenu" />
      </MenuButton>
    </div>
  );
};
