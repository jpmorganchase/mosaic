import React, { useEffect, useRef, useState } from 'react';
import { useRoute } from '@jpmorganchase/mosaic-store';
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

  const { route } = useRoute();

  const handleNavigationToggle = () => {
    setOpen(!open);
  };

  useEffect(() => {
    // Close drawer whenever a page loads
    setOpen(false);
  }, [route]);

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
