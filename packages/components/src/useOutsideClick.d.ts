import { RefObject } from 'react';
export declare const useOutsideClick: (
  triggerRef: RefObject<HTMLDivElement>,
  callback: () => void
) => RefObject<HTMLDivElement>;
