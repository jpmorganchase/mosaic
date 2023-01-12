import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  createContext,
  ReactNode
} from 'react';

export const lightMode = 'light';
export const darkMode = 'dark';

export type ColorMode = 'dark' | 'light';
export const themePrefKey = 'mosaic-theme-pref';
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ColorModeContextValues {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
}

export const ColorModeContext = createContext<ColorModeContextValues>({
  colorMode: 'light',
  setColorMode: () => undefined
});

export function useColorMode(): ColorMode {
  const context = React.useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error('useColorMode must be used within a ColorModeContext');
  }
  return context.colorMode;
}

export function ColorModeProvider({
  children,
  defaultColorMode = lightMode
}: {
  children: ReactNode;
  defaultColorMode?: ColorMode;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>(defaultColorMode);

  useIsomorphicLayoutEffect(() => {
    let nextColorMode;
    try {
      const chosenMode = localStorage.getItem(themePrefKey);
      const prefersDarkMode = matchMedia('(prefers-color-scheme:dark)').matches
        ? 'dark'
        : defaultColorMode;
      // Precedence rules
      // 1. respect user's choice
      // 2. respect user's OS/browser color choice
      // 3. defaultColorMode
      nextColorMode = (chosenMode || prefersDarkMode || defaultColorMode) as ColorMode;
      setColorMode(nextColorMode);
    } catch (e) {
      console.error(`Could not set default color mode to ${nextColorMode}`);
    }
  }, [defaultColorMode]);

  const value = useMemo(
    () => ({
      colorMode,
      setColorMode: (nextColorMode: ColorMode) => {
        setColorMode(nextColorMode);
        try {
          localStorage.setItem(themePrefKey, nextColorMode);
        } catch (e) {
          console.error(`Could not persist default color mode ${nextColorMode} in local storage`);
        }
      }
    }),
    [colorMode, setColorMode]
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}
