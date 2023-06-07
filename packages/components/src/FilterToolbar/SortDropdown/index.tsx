import { SyntheticEvent, useState } from 'react';
import { Dropdown, Option, DropdownProps } from '@salt-ds/core';
import { Icon } from '../../Icon';
import { useToolbarDispatch, useToolbarState } from '../ToolbarProvider';
import { itemToLabel as defaultItemToLabel, source as defaultSource } from './defaultSort';

type PartialDropdownProps = DropdownProps;

export interface FilterSortDropdownProps extends PartialDropdownProps {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItem: string | undefined) => string;
  /** Dropdown list source */
  source?: string[];
  itemToString?: DropdownProps['valueToString'];
}

export function FilterSortDropdown({
  className,
  itemToString = defaultItemToLabel,
  labelButton,
  source = defaultSource,
  ...rest
}: FilterSortDropdownProps) {
  const dispatch = useToolbarDispatch();
  const { sort = source[0] } = useToolbarState();
  const [, setIsOpen] = useState(false);

  const handleSelect = (_e: SyntheticEvent, selectedItem: string[]) => {
    if (selectedItem[0]) {
      dispatch({ type: 'setSort', value: selectedItem[0] });
    }
  };

  return (
    <Dropdown
      startAdornment={<Icon name="swap" />}
      className={className}
      valueToString={itemToString}
      value={labelButton ? labelButton(sort) : sort}
      onOpenChange={setIsOpen}
      onSelectionChange={handleSelect}
      selected={[sort]}
      style={{ width: 150 }}
      {...rest}
    >
      {source.map(item => (
        <Option value={item} key={item} />
      ))}
    </Dropdown>
  );
}
