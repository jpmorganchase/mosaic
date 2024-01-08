import { Icon, Link } from '@jpmorganchase/mosaic-components';
import { MenuButton, MenuDescriptor } from '@salt-ds/lab';
import { useRouter } from 'next/navigation';
import { useContentEditor, EditorControls } from '@jpmorganchase/mosaic-content-editor-plugin';
import { useColorMode } from '@jpmorganchase/mosaic-store';
import { useSession } from 'next-auth/react';

import { UserProfile } from '../UserProfile';
import styles from './styles.css';

type ActionMenuItem = {
  onSelect?: () => void;
  link?: string;
  title: string;
};

function toUpperFirst(str) {
  return `${str.substr(0, 1).toUpperCase()}${str.toLowerCase().substr(1)}`;
}

export const AppHeaderControls = ({ children }) => {
  const router = useRouter();
  const { colorMode, setColorMode } = useColorMode();

  const { data: session } = useSession();
  const isLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGIN === 'true' || false;
  const isLoggedIn = session != null;
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
  if (isLoginEnabled && isLoggedIn) {
    actionMenuOptions = [...actionMenuOptions, { title: 'Logout', link: '/api/auth/signout' }];
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

  const initialSource: MenuDescriptor = {
    menuItems: actionMenuOptions
  };

  return (
    <div className={styles.root}>
      {isLoginEnabled && <EditorControls enabled={isLoggedIn} />}
      {children}
      {isLoginEnabled && (
        <div className={styles.userInfo}>
          {isLoggedIn ? (
            <UserProfile
              avatarUrl={session?.user?.image || ''}
              firstName={toUpperFirst(session?.user?.name)}
              prefixText="Welcome, "
            />
          ) : (
            // eslint-disable-next-line react/jsx-no-bind
            <Link href="/api/auth/signin" variant="component">
              Login
            </Link>
          )}
        </div>
      )}
      <MenuButton
        CascadingMenuProps={{
          initialSource,
          onItemClick: handleMenuSelect,
          rootPlacement: 'bottom-end'
        }}
        className={styles.menuButton}
        hideCaret
        key={`${colorMode} - ${pageState} - ${isLoggedIn ? 'in' : 'out'}`}
      >
        <Icon aria-label="select an action" name="microMenu" />
      </MenuButton>
    </div>
  );
};
