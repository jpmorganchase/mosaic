import { useState } from 'react';
import { useFloatingUI } from '@salt-ds/core';
import { useDismiss, useInteractions } from '@floating-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Popper } from '../Popper/Popper';

// Editor link/table/toolbar popovers share Salt's context with Floating UI's
// dismiss hooks. Exercise the real pair so dependency drift cannot hide here.
function EditorPopover() {
  const [open, setOpen] = useState(false);
  const { context, floating, reference, strategy, x, y } = useFloatingUI({
    open,
    onOpenChange: setOpen
  });
  const { getFloatingProps } = useInteractions([useDismiss(context)]);
  return (
    <>
      <button ref={reference} onClick={() => setOpen(true)}>
        Edit link
      </button>
      <button>Outside</button>
      <Popper
        ref={floating}
        open={open}
        {...getFloatingProps()}
        style={{ position: strategy, left: x ?? 0, top: y ?? 0 }}
      >
        <input aria-label="Link URL" />
      </Popper>
    </>
  );
}

describe('editor floating context compatibility', () => {
  test('allows input focus and dismisses on Escape', async () => {
    render(<EditorPopover />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit link' }));
    const input = await screen.findByRole('textbox', { name: 'Link URL' });
    input.focus();
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });

  test('dismisses on an outside pointer press', async () => {
    render(<EditorPopover />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit link' }));
    await screen.findByRole('textbox', { name: 'Link URL' });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });
});
