/// <reference types="react" />
import { ComboBoxProps } from '@salt-ds/lab';
export interface FilterSearchProps extends ComboBoxProps<string, 'deselectable'> {}
export declare function FilterSearch({
  className,
  source,
  ...rest
}: FilterSearchProps): JSX.Element;
