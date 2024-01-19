import { useMemo, useState, useId } from 'react';
import classnames from 'clsx';
import { Dropdown, DropdownButton, DropdownProps, SelectionChangeHandler } from '@salt-ds/lab';
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

export interface FilterDropdownProps extends DropdownProps<string, 'multiple'> {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItems: string[] | undefined) => string;
}

const CLEAR_ALL = 'Clear all';

export function FilterDropdown({
  className,
  itemToString,
  labelButton,
  source = [],
  ...rest
}: FilterDropdownProps) {
  const id = useId();
  const dispatch = useToolbarDispatch();
  const { filters = [] } = useToolbarState();
  const [isOpen, setIsOpen] = useState(false);
  const listItems = useMemo(() => (source.length > 1 ? [...source, CLEAR_ALL] : source), [source]);
  const handleSelect: SelectionChangeHandler<string, 'multiple'> = (_e, selectedItems) => {
    const nextSelectedItems: string[] = selectedItems.includes(CLEAR_ALL) ? [] : selectedItems;
    dispatch({ type: 'setFilters', value: nextSelectedItems });
  };
  return (
    <Dropdown<string, 'multiple'>
      id={id}
      aria-label={isOpen ? 'close filters menu' : 'open filters menu'}
      className={classnames(className, styles.root)}
      itemToString={itemToString}
      onOpenChange={setIsOpen}
      onSelectionChange={handleSelect}
      selected={filters}
      selectionStrategy="multiple"
      source={listItems}
      triggerComponent={
        <span className={styles.triggerRoot}>
          <Icon name="filter" />
          <DropdownButton
            label={labelButton ? labelButton(filters) : defaultButtonLabel(filters)}
          />
        </span>
      }
      width={200}
      {...rest}
    />
  );
}
