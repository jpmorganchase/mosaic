import { act, renderHook } from '@testing-library/react-hooks';

import useStore, {
  ContentEditorState,
  useEditorUser,
  useIsInsertingLink,
  usePageState,
  usePreviewContent,
  useSetContent
} from '../index';

describe('GIVEN the Content Editor store', () => {
  describe('WHEN initialized with the default state', () => {
    let currentState: ContentEditorState;
    beforeAll(() => {
      const { result } = renderHook(() => useStore());
      currentState = result.current;
    });
    test('THEN the PageState is VIEW', () => {
      expect(currentState.pageState).toEqual('VIEW');
    });
    test('THEN the user is undefined', () => {
      expect(currentState.user).toEqual(undefined);
    });
    test('THEN the previewContent is undefined', () => {
      expect(currentState.previewContent).toEqual(undefined);
    });
    test('THEN the error message is undefined', () => {
      expect(currentState.errorMessage).toEqual(undefined);
    });
    test('THEN isInsertlingLink is false', () => {
      expect(currentState.isInsertingLink).toEqual(false);
    });
    test('THEN there is a setter for pageState', () => {
      expect(currentState.setPageState).toBeDefined();
    });
    test('THEN there is a setter for errorMessage', () => {
      expect(currentState.setErrorMessage).toBeDefined();
    });
    test('THEN there is a setter for user', () => {
      expect(currentState.setUser).toBeDefined();
    });
    test('THEN there is a setter for previewContent', () => {
      expect(currentState.setPreviewContent).toBeDefined();
    });
    test('THEN you can start editing', () => {
      expect(currentState.startEditing).toBeDefined();
    });
    test('THEN you can stop editing', () => {
      expect(currentState.stopEditing).toBeDefined();
    });
    test('THEN there is a setter for isInsertingLink', () => {
      expect(currentState.setIsInsertingLink).toBeDefined();
    });
  });

  describe('AND WHEN setPageState is called', () => {
    test('THEN the pageState is updated', async () => {
      const { result } = renderHook(() => useStore());
      act(() => result.current.setPageState('EDIT'));
      expect(result.current.pageState).toEqual('EDIT');
    });
  });

  describe('AND WHEN startEditing is called ', () => {
    test('THEN editing is started', async () => {
      const { result } = renderHook(() => useStore());
      act(() => result.current.startEditing());
      expect(result.current.pageState).toEqual('EDIT');
    });
  });

  describe('AND WHEN stopEditing is called', () => {
    test('THEN editing is stopped', () => {
      const { result } = renderHook(() => useStore());
      act(() => result.current.stopEditing());
      expect(result.current.pageState).toEqual('VIEW');
      expect(result.current.previewContent).toBeUndefined();
      expect(result.current.errorMessage).toBeUndefined();
    });
  });

  describe('AND WHEN setPreviewContent is called', () => {
    test('THEN the previewContent is updated', async () => {
      const { result } = renderHook(() => useStore());
      act(() => result.current.setPreviewContent('some markdown content'));
      expect(result.current.previewContent).toEqual('some markdown content');
    });
  });

  describe('AND WHEN setErrorMessage is called', () => {
    test('THEN the errorMessage is updated', async () => {
      const { result } = renderHook(() => useStore());
      act(() => result.current.setErrorMessage('an error'));
      expect(result.current.errorMessage).toEqual('an error');
    });
  });

  describe('AND WHEN setUser is called', () => {
    test('THEN the user is updated', async () => {
      const user = { sid: 'S12345', displayName: 'name', email: 'email@domain.com' };
      const { result } = renderHook(() => useStore());
      act(() => result.current.setUser(user));
      expect(result.current.user).toEqual(user);
    });
  });

  describe('GIVEN the usePreviewContent hook', () => {
    test('WHEN called provides the previewContent', async () => {
      const { setPreviewContent } = useStore.getState();
      const { result } = renderHook(() => usePreviewContent());

      expect(result.current).toBeUndefined();
      await act(() => setPreviewContent('some content'));
      expect(result.current).toEqual('some content');
    });
  });

  describe('GIVEN the useSetContent hook', () => {
    test('WHEN called updates the previewContent', () => {
      const { result } = renderHook(() => useSetContent());
      expect(useStore.getState().previewContent).toBeUndefined();

      act(() => result.current('some content'));
      expect(useStore.getState().previewContent).toEqual('some content');
    });
  });

  describe('GIVEN the usePageState hook', () => {
    test('WHEN called provides the page state and an updater', () => {
      const { result } = renderHook(() => usePageState());
      expect(result.current.pageState).toEqual('VIEW');
      expect(result.current.setPageState).toBeDefined();
    });
    test('WHEN called provides the error message and an updater', () => {
      const { result } = renderHook(() => usePageState());
      expect(result.current.errorMessage).toBeUndefined();
      act(() => result.current.setErrorMessage('an error'));
      expect(result.current.errorMessage).toEqual('an error');
    });
  });

  describe('GIVEN the useEditorUser hook', () => {
    test('WHEN called provides the user and an updater', () => {
      const { result } = renderHook(() => useEditorUser());
      expect(result.current.user).toEqual(undefined);
      expect(result.current.setUser).toBeDefined();
    });
    test('AND when updater is called, user is updated', () => {
      const user = { sid: 'S12345', displayName: 'name', email: 'email@domain.com' };
      const { result } = renderHook(() => useEditorUser());
      expect(result.current.user).toEqual(undefined);
      act(() => result.current.setUser(user));
      expect(result.current.user).toEqual(user);
    });
  });

  describe('GIVEN the useIsInsertingLink hook', () => {
    test('WHEN called provides the state and an updater', () => {
      const { result } = renderHook(() => useIsInsertingLink());
      expect(result.current.isInsertingLink).toEqual(false);
      expect(result.current.setIsInsertingLink).toBeDefined();
    });
    test('AND when updater is called, isInsertingLink is updated', () => {
      const { result } = renderHook(() => useIsInsertingLink());
      expect(result.current.isInsertingLink).toEqual(false);
      act(() => result.current.setIsInsertingLink(true));
      expect(result.current.isInsertingLink).toEqual(true);
    });
  });
});
