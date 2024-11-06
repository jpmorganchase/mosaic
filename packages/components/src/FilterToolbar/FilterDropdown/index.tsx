import { SyntheticEvent, useMemo } from 'react';
import { Dropdown, DropdownProps, Option } from '@salt-ds/core';
import { Icon } from '../../Icon';
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

export interface FilterDropdownProps extends DropdownProps {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItems: string[] | undefined) => string;
  /** Dropdown list source */
  source?: string[];
  itemToString?: DropdownProps['valueToString'];
}

const CLEAR_ALL = 'Clear all';

export function FilterDropdown({
  className,
  itemToString,
  labelButton,
  source = [],
  ...rest
}: FilterDropdownProps) {
  const dispatch = useToolbarDispatch();
  const { filters = [] } = useToolbarState();
  const listItems = useMemo(() => (source.length > 1 ? [...source, CLEAR_ALL] : source), [source]);
  const handleSelect = (_e: SyntheticEvent, selectedItems: string[]) => {
    const nextSelectedItems: string[] = selectedItems.includes(CLEAR_ALL) ? [] : selectedItems;
    dispatch({ type: 'setFilters', value: nextSelectedItems });
  };
  return (
    <Dropdown
      aria-label="Filters"
      className={className}
      valueToString={itemToString}
      value={labelButton ? labelButton(filters) : defaultButtonLabel(filters)}
      startAdornment={<Icon name="filter" />}
      onSelectionChange={handleSelect}
      selected={filters}
      multiselect
      style={{ width: 200 }}
      {...rest}
    >
      {listItems.map(item => (
        <Option value={item} key={item} />
      ))}
    </Dropdown>
  );
}
