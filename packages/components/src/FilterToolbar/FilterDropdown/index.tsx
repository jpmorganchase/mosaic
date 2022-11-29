import React, { useMemo, useState } from 'react';
import classnames from 'classnames';
import {
  Dropdown,
  DropdownButton,
  DropdownProps,
  SelectionChangeHandler
} from '@jpmorganchase/uitk-lab';
import { Icon } from '../../Icon';
import styles from './styles.css';
import { useToolbarDispatch, useToolbarState } from '../ToolbarProvider';

const defaultButtonLabel = (selectedItems: string[] | undefined) => {
  if (!selectedItems || selectedItems.length === 0) {
    return 'All';
  }
  if (selectedItems.length === 1) {
    return `${selectedItems[0]}`;
  }
  return `${selectedItems.length} Items Selected`;
};

export interface FilterDropdownProps<Item> extends DropdownProps<Item> {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItems: string[] | undefined) => string;
}

const CLEAR_ALL = 'Clear all';

const DropdownIcon = () => <Icon name="chevronDown" />;

export function FilterDropdown<T>({
  className,
  itemToString,
  labelButton,
  source = [],
  ...rest
}: FilterDropdownProps<T>) {
  const dispatch = useToolbarDispatch();
  const { filters = [] } = useToolbarState();
  const [isOpen, setIsOpen] = useState(false);
  const listItems = useMemo(() => (source.length > 1 ? [...source, CLEAR_ALL] : source), [source]);
  const handleSelect: SelectionChangeHandler<string, 'multiselect'> = (_e, selectedItems) => {
    const nextSelectedItems: string[] = selectedItems.includes(CLEAR_ALL) ? [] : selectedItems;
    dispatch({ type: 'setFilters', value: nextSelectedItems });
  };
  return (
    <Dropdown
      aria-label={isOpen ? 'close filters menu' : 'open filters menu'}
      className={classnames(className, styles.root)}
      itemToString={itemToString}
      onOpenChange={setIsOpen}
      onSelectionChange={handleSelect}
      selected={filters}
      selectionStrategy="multiple"
      source={listItems}
      triggerComponent={
        <DropdownButton
          IconComponent={DropdownIcon}
          label={labelButton ? labelButton(filters) : defaultButtonLabel(filters)}
        />
      }
      width={200}
      {...rest}
    />
  );
}
