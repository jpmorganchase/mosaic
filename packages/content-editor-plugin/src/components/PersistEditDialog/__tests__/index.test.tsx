import { describe, expect, test, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';

import { PersistDialog } from '../index';
import { usePageState } from '../../../store';
import { nodes } from '../../../nodes';
import useWorkflowFeed from '../../../hooks/useWorkflowFeed';

vi.mock('../../../store', async importOriginal => ({
  ...(await importOriginal()),
  usePageState: vi.fn()
}));

const mockSendWorkflowProgressMessage = vi.fn();
vi.mock('../../../hooks/useWorkflowFeed');
vi.mocked(useWorkflowFeed).mockReturnValue({
  sendWorkflowProgressMessage: mockSendWorkflowProgressMessage
});

const setPageStateSpy = vi.fn();
const setErrorMessageSpy = vi.fn();
const mockMeta = { sourceId: 'source-1', route: 'route' };

const renderPersistDialog = (props = { meta: mockMeta }) => {
  render(
    <LexicalComposer initialConfig={{ namespace: 'persist-dialog-test', nodes, onError: vi.fn() }}>
      <PersistDialog {...props} />
    </LexicalComposer>
  );
};

describe('GIVEN a PersistEditDialog', () => {
  beforeAll(() => {
    vi.mocked(usePageState).mockReturnValue({
      pageState: 'SAVING',
      setErrorMessage: setErrorMessageSpy,
      setPageState: setPageStateSpy,
      errorMessage: undefined
    });
  });

  test('THEN the dialog is open when SAVING', () => {
    // arrange
    renderPersistDialog();
    // assert
    expect(
      screen.getByText(
        'The content of this page resides in a Git repository and to update it requires a Pull Request which will be reviewed by the content owners.'
      )
    ).toBeDefined();
  });

  test('THEN cancelling returns the page to edit mode', async () => {
    // arrange
    renderPersistDialog();
    // act
    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);
    // assert
    expect(setPageStateSpy).toBeCalledTimes(1);
    expect(setPageStateSpy.mock.calls[0][0]).toEqual('EDIT');
  });

  describe.skip('AND WHEN we can create a Pull Request', () => {
    beforeAll(() => {
      server.use(postSaveContentSuccessHandler);
    });
    test('THEN raising a PR provides a link to the PR', async () => {
      // arrange
      renderPersistDialog();
      // act
      const raisePrButton = screen.getByText('Raise Pull Request');
      userEvent.click(raisePrButton);
      // assert
      await waitFor(() => {
        expect(screen.getByText('A Pull Request for your changes has been created.'));
      });
    });
  });
});
