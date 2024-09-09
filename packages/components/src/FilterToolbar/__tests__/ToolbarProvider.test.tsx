import { test, expect } from 'vitest';
import React, { useEffect } from 'react';
import { render } from '@testing-library/react';

import { useToolbarState, useToolbarDispatch, ToolbarProvider } from '../ToolbarProvider';

function TestUseToolbarDispatch({ action }) {
  const dispatch = useToolbarDispatch();
  useEffect(() => {
    dispatch(action);
  });
  return null;
}

function TestUseToolbarState({ validate }) {
  const state = useToolbarState();
  validate(state);
  return null;
}

test('can add filters', async () => {
  const props = {
    handleStateChange: state => {
      expect(state).toEqual({ filters: ['Filter 3'], sort: undefined });
    },
    initialState: { filters: [], sort: undefined }
  };
  render(
    <ToolbarProvider {...props}>
      <TestUseToolbarDispatch action={{ type: 'addFilter', value: 'Filter 3' }} />
    </ToolbarProvider>
  );
});

test('can set filters', async () => {
  const props = {
    handleStateChange: state => {
      expect(state).toEqual({ filters: ['Filter 3'], sort: undefined });
    },
    initialState: { filters: [], sort: undefined }
  };
  render(
    <ToolbarProvider {...props}>
      <TestUseToolbarDispatch action={{ type: 'setFilters', value: 'Filter 3' }} />
    </ToolbarProvider>
  );
});

test('can remove filters', async () => {
  const props = {
    handleStateChange: state => {
      expect(state).toEqual({ filters: ['Filter 1'], sort: undefined });
    },
    initialState: { filters: ['Filter 1', 'Filter 3'], sort: undefined }
  };
  render(
    <ToolbarProvider {...props}>
      <TestUseToolbarDispatch action={{ type: 'removeFilter', value: 'Filter 3' }} />
    </ToolbarProvider>
  );
});

test('can set sort', async () => {
  const props = {
    handleStateChange: state => {
      expect(state).toEqual({ filters: undefined, sort: 'Sort 1' });
    },
    initialState: { filters: undefined, sort: undefined }
  };
  render(
    <ToolbarProvider {...props}>
      <TestUseToolbarDispatch action={{ type: 'setSort', value: 'Sort 1' }} />
    </ToolbarProvider>
  );
});

test('can read the state', async () => {
  const validate = state => {
    expect(state).toEqual({ filters: ['Filter 1'], sort: 'Sort 1' });
  };
  render(
    <ToolbarProvider initialState={{ filters: ['Filter 1'], sort: 'Sort 1' }}>
      <TestUseToolbarState validate={validate} />
    </ToolbarProvider>
  );
});
