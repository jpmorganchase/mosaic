import React, { useState } from 'react';
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
import { itemToLabel as defaultItemToLabel, source as defaultSource } from './defaultSort';

type PartialDropdownProps = Omit<DropdownProps<string, 'default'>, 'source'>;

export interface FilterSortDropdownProps extends PartialDropdownProps {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItem: string | undefined) => string;
  /** Dropdown list source */
  source?: string[];
}

const DropdownIcon = () => <Icon name="chevronDown" />;

export function FilterSortDropdown({
  className,
  itemToString = defaultItemToLabel,
  labelButton,
  source = defaultSource,
  ...rest
}: FilterSortDropdownProps) {
  const dispatch = useToolbarDispatch();
  const { sort = source[0] } = useToolbarState();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect: SelectionChangeHandler<string, 'default'> = (_e, selectedItem) => {
    if (selectedItem) {
      dispatch({ type: 'setSort', value: selectedItem });
    }
  };

  return (
    <Dropdown
      className={classnames(className, styles.root)}
      itemToString={itemToString}
      onOpenChange={setIsOpen}
      onSelectionChange={handleSelect}
      selected={sort}
      source={source}
      triggerComponent={
        <DropdownButton
          IconComponent={DropdownIcon}
          label={labelButton ? labelButton(sort) : sort}
        />
      }
      width={150}
      {...rest}
    />
  );
}
