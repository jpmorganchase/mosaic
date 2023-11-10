import React, { FC, Context } from 'react';
export declare type TileState = {
  active: [boolean | undefined, React.Dispatch<React.SetStateAction<boolean>>];
  focused: [boolean | undefined, React.Dispatch<React.SetStateAction<boolean>>];
  highlighted: [boolean | undefined, React.Dispatch<React.SetStateAction<boolean>>];
};
export declare const TileStateContext: Context<TileState>;
export declare type TileStateProps = {
  /** The children components of the Tile component */
  children?: React.ReactNode;
};
export declare const TileStateProvider: FC<TileStateProps>;
export declare const useTileState: () => TileState;
