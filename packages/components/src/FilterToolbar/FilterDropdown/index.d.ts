/// <reference types="react" />
import { DropdownProps } from '@salt-ds/lab';
export interface FilterDropdownProps extends DropdownProps<string, 'multiple'> {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItems: string[] | undefined) => string;
}
export declare function FilterDropdown({
  className,
  itemToString,
  labelButton,
  source,
  ...rest
}: FilterDropdownProps): JSX.Element;
