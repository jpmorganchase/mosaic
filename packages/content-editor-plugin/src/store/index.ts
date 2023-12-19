import { ReactNode, useCallback } from 'react';
import { create } from 'zustand';

type PageState = 'VIEW' | 'EDIT' | 'REVIEW' | 'SAVING' | 'ERROR';
type UserType = { sid: string; displayName: string; email: string };

export interface ContentEditorState {
  pageState: PageState;
  user?: UserType;
  previewContent?: ReactNode;
  errorMessage?: string;
  isInsertingLink: boolean;
  setPageState: (state: PageState) => void;
  startEditing: () => void;
  stopEditing: () => void;
  setPreviewContent: (content: ReactNode) => void;
  setErrorMessage: (errorMessage: string) => void;
  setUser: (user: UserType) => void;
  setIsInsertingLink: (isInsertingLink: boolean) => void;
}

const initialState: Pick<
  ContentEditorState,
  'pageState' | 'user' | 'previewContent' | 'errorMessage' | 'isInsertingLink'
> = {
  pageState: 'VIEW',
  user: undefined,
  previewContent: undefined,
  errorMessage: undefined,
  isInsertingLink: false
};

const useStore = create<ContentEditorState>(set => ({
  ...initialState,
  setPageState: state => set({ pageState: state }),
  startEditing: () => set({ ...initialState, pageState: 'EDIT' }),
  stopEditing: () => set({ pageState: initialState.pageState }),
  setPreviewContent: (content: ReactNode) =>
    set({ pageState: 'EDIT', previewContent: content, errorMessage: undefined }),
  setErrorMessage: (errorMessage: string) => set({ errorMessage, pageState: 'ERROR' }),
  setUser: (user: any) => set({ user }),
  setIsInsertingLink: (isInsertingLink: boolean) => set({ isInsertingLink })
}));

export const usePreviewContent = () => useStore(useCallback(state => state.previewContent, []));

export const useSetContent = () => useStore(useCallback(state => state.setPreviewContent, []));

export const usePageState = () =>
  useStore(
    useCallback(
      state => ({
        pageState: state.pageState,
        setPageState: state.setPageState,
        errorMessage: state.errorMessage,
        setErrorMessage: state.setErrorMessage
      }),
      []
    )
  );

export const useEditorUser = () =>
  useStore(
    useCallback(
      state => ({
        user: state.user,
        setUser: state.setUser
      }),
      []
    )
  );

export const useIsInsertingLink = () =>
  useStore(
    useCallback(
      state => ({
        isInsertingLink: state.isInsertingLink,
        setIsInsertingLink: state.setIsInsertingLink
      }),
      []
    )
  );

export default useStore;
