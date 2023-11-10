/// <reference types="react" />
import { DropdownProps } from '@salt-ds/lab';
declare type PartialDropdownProps = Omit<DropdownProps<string, 'default'>, 'source'>;
export interface FilterSortDropdownProps extends PartialDropdownProps {
  /** Callback to translate the selected list item to a Button label */
  labelButton?: (selectedItem: string | undefined) => string;
  /** Dropdown list source */
  source?: string[];
}
export declare function FilterSortDropdown({
  className,
  itemToString,
  labelButton,
  source,
  ...rest
}: FilterSortDropdownProps): JSX.Element;
export {};
