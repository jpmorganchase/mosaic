import { Menu, MenuTrigger, MenuPanel, MenuItem } from '@salt-ds/core';
import { Icon, Button } from '@jpmorganchase/mosaic-components';
import { IconNames } from '@jpmorganchase/mosaic-icons';

export type ActionMenuItem = {
  title: string;
  icon: IconNames;
};

export type ActionMenuSource = ActionMenuItem[];

interface ActionMenuProps {
  items: ActionMenuSource;
  onItemClick: (item: ActionMenuItem) => void;
}

export function ActionMenu({ items, onItemClick }: ActionMenuProps) {
  return (
    <Menu>
      <MenuTrigger>
        <Button variant="secondary" aria-label="Actions">
          <Icon name="menu" aria-hidden />
        </Button>
      </MenuTrigger>
      <MenuPanel>
        {items.map(item => (
          <MenuItem key={item.title} onClick={() => onItemClick(item)}>
            <Icon name={item.icon} />
            {item.title}
          </MenuItem>
        ))}
      </MenuPanel>
    </Menu>
  );
}
