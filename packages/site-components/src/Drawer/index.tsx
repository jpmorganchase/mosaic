import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Drawer as SaltDrawer, DrawerCloseButton } from '@salt-ds/core';
import { useOutsideClick } from '@jpmorganchase/mosaic-components';
import styles from './styles.css';

export type TriggerElementProps = {
  /** open state of drawer */
  open: boolean;
  /** click handler which is used to open drawer */
  onClick: React.MouseEventHandler<HTMLElement>;
};

export interface DrawerProps {
  /** contents of drawer */
  children: React.ReactElement;
  side: 'left' | 'right';
  TriggerElement: React.FC<TriggerElementProps>;
}

export function Drawer({ children, TriggerElement, side }: DrawerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useOutsideClick(triggerRef, () => setOpen(false));

  // The router's pathname rather than the store's `route`: the header's
  // drawer lives in a layout that stays mounted across navigations, and
  // its store isn't given the page's route.
  const pathname = usePathname();

  const handleNavigationToggle = () => {
    setOpen(!open);
  };

  useEffect(() => {
    // Close drawer whenever a page loads
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div ref={triggerRef}>
        <TriggerElement open={open} onClick={handleNavigationToggle} />
      </div>
      <SaltDrawer className={styles.root} position={side} open={open} ref={rootRef}>
        <DrawerCloseButton onClick={handleNavigationToggle} />
        {children}
      </SaltDrawer>
    </>
  );
}
