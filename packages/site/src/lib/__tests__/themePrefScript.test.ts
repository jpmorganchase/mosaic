import { describe, expect, test } from 'vitest';

import { themePrefScript } from '../themePrefScript';

function runScript(getItem: () => string | null, { wide = true } = {}) {
  const attributes: Record<string, string> = {};
  const classes = new Set<string>();
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
      classList: { add: (name: string) => classes.add(name) }
    }
  };
  const window = {
    matchMedia: (query: string) => ({ matches: query === '(min-width: 960px)' && wide })
  };
  new Function('localStorage', 'document', 'window', themePrefScript)(
    { getItem },
    document,
    window
  );
  return { mode: attributes['data-mode'], classes: [...classes] };
}

describe('GIVEN the theme preference script', () => {
  test('THEN it applies the stored colour mode', () => {
    expect(runScript(() => JSON.stringify({ state: { colorMode: 'dark' } })).mode).toBe('dark');
  });

  test('WHEN nothing is stored THEN it applies the default light mode', () => {
    expect(runScript(() => null).mode).toBe('light');
  });

  test('WHEN the stored value is malformed or has no mode THEN it applies light mode', () => {
    expect(runScript(() => '{not json').mode).toBe('light');
    expect(runScript(() => JSON.stringify({ state: {} })).mode).toBe('light');
  });

  test('WHEN storage is blocked THEN it applies light mode', () => {
    expect(
      runScript(() => {
        throw new Error('SecurityError');
      }).mode
    ).toBe('light');
  });

  test("THEN it applies Salt's density for the viewport, as ThemeProvider does", () => {
    expect(runScript(() => null, { wide: true }).classes).toEqual(['salt-density-low']);
    expect(runScript(() => null, { wide: false }).classes).toEqual(['salt-density-touch']);
  });
});
