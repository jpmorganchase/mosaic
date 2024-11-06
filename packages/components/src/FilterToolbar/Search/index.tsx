import { ChangeEvent, SyntheticEvent, useState } from 'react';
import classnames from 'clsx';
import { ComboBox, Option, ComboBoxProps } from '@salt-ds/core';
import { Icon } from '../../Icon';

import { useToolbarDispatch } from '../ToolbarProvider';
import styles from './styles.css';

const regExp = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(string: string): string {
  return string.replace(regExp, '\\$&');
}

export interface FilterSearchProps extends ComboBoxProps {
  source: string[];
}

export function FilterSearch({ className, source = [], ...rest }: FilterSearchProps) {
  const dispatch = useToolbarDispatch();
  const [value, setValue] = useState('');

  // TODO convert to multiselect once Salt supports Multiselect from a ComboBox
  const handleSelect = (_e: SyntheticEvent, newSelected: string[]) => {
    dispatch({ type: 'setFilters', value: newSelected });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  return (
    <ComboBox
      startAdornment={<Icon name="filter" />}
      className={classnames(className, styles.root)}
      onSelectionChange={handleSelect}
      value={value}
      onChange={handleChange}
      style={{ width: 200 }}
      {...rest}
    >
      {source
        .filter(item => item.match(new RegExp(`\\b(${escapeRegExp(value)})`, 'gi')))
        .map(item => (
          <Option value={item} key={item} />
        ))}
    </ComboBox>
  );
}
