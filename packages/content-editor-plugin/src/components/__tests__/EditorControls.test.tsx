/**
 * Smoke tests for {@link EditorControls}.
 *
 * Targets the contract that downstream sites rely on: two toolbar
 * buttons (new-page + edit), disabled while logged out, labelled
 * correctly in edit vs view mode, and the edit button toggles via
 * `useEditMode`. The full create/cancel side-effects are covered by
 * `useEditMode.test.tsx`; this file just keeps the wiring honest.
 *
 * NewPageDialog is stubbed because instantiating Salt's full Dialog
 * + ComboBox + sitemap fetch inside jsdom is brittle for what is
 * supposed to be a regression net — the dialog itself has its own
 * e2e coverage in `packages/site/e2e/editor.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const startEditing = vi.fn();
const stopEditing = vi.fn();
let isEditingState = false;

vi.mock('../../useEditMode', () => ({
  useEditMode: () => ({
    isEditing: isEditingState,
    startEditing,
    stopEditing
  })
}));

vi.mock('../NewPageDialog', () => ({
  // Render a deterministic marker so we can assert the dialog
  // mounts (closed by default — the launcher is what we care about).
  // The client setup overrides the default test-id attribute to
  // `data-mosaic-testid`; honour that here so `getByTestId` matches.
  NewPageDialog: ({ open }: { open: boolean }) =>
    open ? <div data-mosaic-testid="new-page-dialog-open" /> : null
}));

import { EditorControls } from '../EditorControls';

beforeEach(() => {
  startEditing.mockReset();
  stopEditing.mockReset();
  isEditingState = false;
});

afterEach(() => {
  isEditingState = false;
});

describe('EditorControls', () => {
  it('disables both toolbar buttons when not enabled', () => {
    render(<EditorControls enabled={false} />);
    expect(screen.getByRole('button', { name: 'create a new page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'start editing' })).toBeDisabled();
  });

  it('enables both buttons when enabled', () => {
    render(<EditorControls enabled />);
    expect(screen.getByRole('button', { name: 'create a new page' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'start editing' })).not.toBeDisabled();
  });

  it('labels the edit button as "start editing" when not editing', () => {
    isEditingState = false;
    render(<EditorControls enabled />);
    expect(screen.getByRole('button', { name: 'start editing' })).toBeInTheDocument();
  });

  it('labels the edit button as "cancel editing" when editing', () => {
    isEditingState = true;
    render(<EditorControls enabled />);
    expect(screen.getByRole('button', { name: 'cancel editing' })).toBeInTheDocument();
  });

  it('calls startEditing when the edit button is clicked in view mode', async () => {
    render(<EditorControls enabled />);
    await userEvent.click(screen.getByRole('button', { name: 'start editing' }));
    expect(startEditing).toHaveBeenCalledOnce();
    expect(stopEditing).not.toHaveBeenCalled();
  });

  it('calls stopEditing when the cancel button is clicked in edit mode', async () => {
    isEditingState = true;
    render(<EditorControls enabled />);
    await userEvent.click(screen.getByRole('button', { name: 'cancel editing' }));
    expect(stopEditing).toHaveBeenCalledOnce();
    expect(startEditing).not.toHaveBeenCalled();
  });

  it('opens the NewPageDialog when the new-page button is clicked', async () => {
    render(<EditorControls enabled />);
    expect(screen.queryByTestId('new-page-dialog-open')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'create a new page' }));
    expect(screen.getByTestId('new-page-dialog-open')).toBeInTheDocument();
  });
});
