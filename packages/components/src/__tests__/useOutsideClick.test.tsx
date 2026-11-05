import { describe, expect, test, vi } from 'vitest';
import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { useOutsideClick } from '../useOutsideClick';

function Harness({ onOutsideClick }: { onOutsideClick: () => void }) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const ref = useOutsideClick(triggerRef, onOutsideClick);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div ref={triggerRef}>
        {/* Like the header drawer's trigger, the icon is removed once open.
            `flushSync` commits that before the click reaches `document`, as
            a browser does for a real click (React renders in a microtask,
            which runs between listeners). */}
        <button onClick={() => flushSync(() => setOpen(true))}>
          {open ? null : <span>icon</span>}
        </button>
      </div>
      <div ref={ref}>
        <span>panel</span>
      </div>
      <span>elsewhere</span>
    </>
  );
}

describe('GIVEN useOutsideClick', () => {
  test('THEN a click elsewhere calls the callback', () => {
    const onOutsideClick = vi.fn();
    render(<Harness onOutsideClick={onOutsideClick} />);
    fireEvent.click(screen.getByText('elsewhere'));
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  test('THEN clicks inside the trigger or the element do not', () => {
    const onOutsideClick = vi.fn();
    render(<Harness onOutsideClick={onOutsideClick} />);
    fireEvent.click(screen.getByText('panel'));
    fireEvent.click(screen.getByRole('button'));
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  test('THEN a click on a trigger child that the click removes is still inside', () => {
    const onOutsideClick = vi.fn();
    render(<Harness onOutsideClick={onOutsideClick} />);
    const icon = screen.getByText('icon');
    fireEvent.click(icon);
    expect(icon.isConnected).toBe(false);
    expect(onOutsideClick).not.toHaveBeenCalled();
  });
});
