import React from 'react';
import { MenuButton, MenuDescriptor } from '@jpmorganchase/uitk-lab';
import { Icon } from '@jpmorganchase/mosaic-components';

import type { CascadingMenuProps } from '@jpmorganchase/uitk-lab';

import styles from './ActionMenu.css';

export type ActionMenuSource = MenuDescriptor;

interface ActionMenuProps {
  initialSource: CascadingMenuProps['initialSource'];
  onItemClick: CascadingMenuProps['onItemClick'];
}

export function ActionMenu({ initialSource, onItemClick }: ActionMenuProps) {
  return (
    <MenuButton
      hideCaret
      CascadingMenuProps={{
        initialSource,
        onItemClick
      }}
    >
      <Icon name="menu" />
    </MenuButton>
  );
}
