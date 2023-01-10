import React from 'react';
import { MenuButton, MenuDescriptor } from '@salt-ds/lab';
import { Icon } from '@jpmorganchase/mosaic-components';

import type { CascadingMenuProps } from '@salt-ds/lab';

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
