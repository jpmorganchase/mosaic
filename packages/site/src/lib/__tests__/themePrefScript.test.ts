import { describe, expect, test } from 'vitest';

import { themePrefScript } from '../themePrefScript';

function runScript(getItem: () => string | null) {
  const attributes: Record<string, string> = {};
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      }
    }
  };
  new Function('localStorage', 'document', themePrefScript)({ getItem }, document);
  return attributes['data-mode'];
}

describe('GIVEN the theme preference script', () => {
  test('THEN it applies the stored colour mode', () => {
    expect(runScript(() => JSON.stringify({ state: { colorMode: 'dark' } }))).toBe('dark');
  });

  test('WHEN nothing is stored THEN it applies the default light mode', () => {
    expect(runScript(() => null)).toBe('light');
  });

  test('WHEN the stored value is malformed or has no mode THEN it applies light mode', () => {
    expect(runScript(() => '{not json')).toBe('light');
    expect(runScript(() => JSON.stringify({ state: {} }))).toBe('light');
  });

  test('WHEN storage is blocked THEN it applies light mode', () => {
    expect(
      runScript(() => {
        throw new Error('SecurityError');
      })
    ).toBe('light');
  });
});
