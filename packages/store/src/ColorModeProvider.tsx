import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import type { ColorMode } from './types/colorMode';

const STORAGE_KEY = 'mosaic-theme-pref';

interface ColorModeContextValue {
  colorMode: ColorMode;
  actions: { setColorMode: (colorMode: ColorMode) => void };
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

function readColorMode(value: string | null): ColorMode | undefined {
  try {
    const mode = value && JSON.parse(value)?.state?.colorMode;
    return mode === 'light' || mode === 'dark' ? mode : undefined;
  } catch {
    return undefined;
  }
}

/** Mount once above the site's theme and content providers. */
export function ColorModeProvider({ children }: { children?: ReactNode }) {
  // Match the server during hydration; the host's inline script handles first paint.
  const [colorMode, setMode] = useState<ColorMode>('light');
  const applyMode = useCallback((mode: ColorMode) => {
    setMode(mode);
    document.documentElement.setAttribute('data-mode', mode);
  }, []);
  const actions = useMemo(
    () => ({
      setColorMode(mode: ColorMode) {
        applyMode(mode);
        try {
          // Preserve the existing persisted format and pre-hydration script contract.
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ state: { colorMode: mode }, version: 0 })
          );
        } catch {
          // The preference still works for this session when storage is unavailable.
        }
      }
    }),
    [applyMode]
  );

  useEffect(() => {
    let savedMode: ColorMode | undefined;
    try {
      savedMode = readColorMode(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage can be blocked by the browser.
    }
    applyMode(savedMode ?? 'light');

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const nextMode = readColorMode(event.newValue);
      if (nextMode) applyMode(nextMode);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [applyMode]);

  const value = useMemo(() => ({ colorMode, actions }), [colorMode, actions]);
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorModeContext(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error('Missing ColorModeProvider in the tree');
  return context;
}
