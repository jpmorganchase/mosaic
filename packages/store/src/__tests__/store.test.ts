import { InitialSiteState, createStore } from '../store';

describe('GIVEN the createStore function', () => {
  describe('WHEN custom initial state is provided', () => {
    test('THEN it overrides the default initial state', () => {
      const MyImageComponent = () => 'custom image';
      const MyLinkComponent = () => 'custom link';
      const initialState: InitialSiteState = {
        colorMode: 'dark',
        LinkComponent: MyLinkComponent,
        ImageComponent: MyImageComponent
      };

      const store = createStore(initialState);
      const state = store.getState();

      expect(state.colorMode).toEqual(initialState.colorMode);
      expect(state.LinkComponent).toEqual(initialState.LinkComponent);
      expect(state.ImageComponent).toEqual(initialState.ImageComponent);
    });
  });
});
