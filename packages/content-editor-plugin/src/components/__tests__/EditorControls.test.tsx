import { describe, expect, test, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorControls } from '../EditorControls';
import store from '../../store';

vi.mock('../../store', async importOriginal => ({
  ...(await importOriginal()),
  default: vi.fn()
}));

const startEditingSpy = vi.fn();
const stopEditingSpy = vi.fn();

describe('GIVEN an EditorControls component', () => {
  describe('WHEN **NOT** logged in', () => {
    beforeAll(() => {
      vi.mocked(store).mockReturnValue({
        startEditing: startEditingSpy,
        isEditing: false
      });
    });
    test('THEN the edit button is disabled', () => {
      render(<EditorControls enabled={false} />);
      const tooltips = screen.queryAllByRole('tooltip');
      expect(tooltips.length).toBe(0);
    });
  });

  describe('WHEN logged in', () => {
    test('THEN the edit button is enabled', () => {
      render(<EditorControls enabled />);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    describe('AND WHEN **NOT** editing and the edit button is clicked', () => {
      beforeAll(() => {
        vi.mocked(store).mockReturnValue({
          startEditing: startEditingSpy,
          pageState: 'VIEW'
        });
      });
      test('THEN editing is started', async () => {
        render(<EditorControls enabled />);
        const button = screen.getByLabelText('start editing');
        await userEvent.click(button);
        expect(startEditingSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND WHEN editing and the edit button is clicked', () => {
      beforeAll(() => {
        vi.mocked(store).mockReturnValue({
          stopEditing: stopEditingSpy,
          pageState: 'EDIT'
        });
      });
      test('THEN editing is stopped', async () => {
        render(<EditorControls enabled />);
        const button = screen.getByLabelText('cancel editing');
        await userEvent.click(button);
        expect(stopEditingSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
