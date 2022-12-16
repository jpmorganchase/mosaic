import React from 'react';
import classnames from 'classnames';
import { escapeRegExp, ComboBox, ComboBoxProps, SelectionChangeHandler } from '@salt-ds/lab';
import { Icon } from '../../Icon';

import { useToolbarDispatch } from '../ToolbarProvider';
import styles from '../SortDropdown/styles.css';

export interface FilterSearchProps extends ComboBoxProps<string, 'deselectable'> {}

export function FilterSearch({ className, source = [], ...rest }: FilterSearchProps) {
  const dispatch = useToolbarDispatch();

  // TODO convert to multiselect once Salt supports Multiselect from a ComboBox
  const handleSelect: SelectionChangeHandler<string, 'deselectable'> = (_e, item) => {
    const value = item === null ? [] : [item];
    dispatch({ type: 'setFilters', value });
  };
  const getFilterRegex: (text: string) => RegExp = value =>
    new RegExp(`\\b(${escapeRegExp(value)})`, 'gi');

  return (
    <ComboBox
      InputProps={{ startAdornment: <Icon name="filter" /> }}
      className={classnames(className, styles.root)}
      getFilterRegex={getFilterRegex}
      onSelectionChange={handleSelect}
      source={source}
      width={200}
      {...rest}
    />
  );
}
