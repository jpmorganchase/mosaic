import React, { useContext, FC, createContext, Context, useMemo } from 'react';

export type TileState = {
  active: [boolean | undefined, React.Dispatch<React.SetStateAction<boolean>>];
  focused: [boolean | undefined, React.Dispatch<React.SetStateAction<boolean>>];
  highlighted: [boolean | undefined, React.Dispatch<React.SetStateAction<boolean>>];
};

export const TileStateContext: Context<TileState> = createContext<TileState>({
  active: [
    false,
    () => {
      throw new Error('no TileState Provider has been defined');
    }
  ],
  focused: [
    false,
    () => {
      throw new Error('no TileState Provider has been defined');
    }
  ],
  highlighted: [
    false,
    () => {
      throw new Error('no TileState Provider has been defined');
    }
  ]
});

export type TileStateProps = {
  /** The children components of the Tile component */
  children?: React.ReactNode;
};

export const TileStateProvider: FC<TileStateProps> = ({ children }) => {
  const [active, setActive] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(false);

  const value = useMemo<TileState>(
    () => ({
      active: [active, setActive],
      focused: [focused, setFocused],
      highlighted: [highlighted, setHighlighted]
    }),
    [active, setActive, focused, setFocused, highlighted, setHighlighted]
  );

  return <TileStateContext.Provider value={value}>{children}</TileStateContext.Provider>;
};

export const useTileState = (): TileState => useContext(TileStateContext);
