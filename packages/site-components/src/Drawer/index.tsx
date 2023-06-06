'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'clsx';
import { useRoute } from '@jpmorganchase/mosaic-store';
import { LayerLayout } from '@salt-ds/lab';
import styles from './styles.css';
import { Button, Icon, useOutsideClick } from '@jpmorganchase/mosaic-components';

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

  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    // Close drawer whenever a page loads
    setOpen(false);
    setIsClient(true);
  }, [route]);

  const portalRoot = isClient ? document.querySelector('[data-mosaic-id="portal-root"]') : null;
  return (
    <>
      <div ref={triggerRef}>
        <TriggerElement open={open} onClick={handleNavigationToggle} />
      </div>
      {portalRoot
        ? createPortal(
            <div className={styles.root}>
              <LayerLayout
                className={classNames(styles.layerLayout, styles[side], {
                  [styles.openLeft]: side === 'left' && open,
                  [styles.closeLeft]: side === 'left' && !open,
                  [styles.openRight]: side === 'right' && open,
                  [styles.closeRight]: side === 'right' && !open
                })}
                isOpen={open}
                disableScrim
                position={side}
                ref={rootRef}
              >
                <Button
                  className={classNames(styles.closeButton, {
                    [styles.leftCloseButton]: side === 'left',
                    [styles.rightCloseButton]: side === 'right'
                  })}
                  variant="secondary"
                  onClick={handleNavigationToggle}
                >
                  <Icon aria-label="close the drawer" name="close" />
                </Button>
                {children}
              </LayerLayout>
            </div>,
            portalRoot
          )
        : null}
    </>
  );
}
