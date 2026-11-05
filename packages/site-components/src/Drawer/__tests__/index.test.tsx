import { describe, expect, test, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/mosaic/index' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const { Drawer } = await import('../index');

const Trigger = ({ open, onClick }: { open: boolean; onClick: React.MouseEventHandler }) => (
  <button onClick={onClick}>{open ? 'open' : 'closed'}</button>
);

const renderDrawer = () => (
  <Drawer side="left" TriggerElement={Trigger}>
    <a href="/mosaic/configure/index">Configure</a>
  </Drawer>
);

describe('GIVEN a Drawer', () => {
  test('THEN it closes when the pathname changes, even if it stays mounted', () => {
    const { rerender } = render(renderDrawer());
    fireEvent.click(screen.getByText('closed'));
    // The open drawer is modal, so the trigger is hidden from the a11y tree.
    expect(screen.getByText('open')).toBeTruthy();

    pathname.current = '/mosaic/configure/index';
    rerender(renderDrawer());

    expect(screen.getByText('closed')).toBeTruthy();
  });
});
