import { describe, expect, test } from 'vitest';

import {
  STORAGE_KEY,
  colorModeScript,
  parseColorModePreference,
  serializeColorModePreference
} from '../theme-preference';

function runScript(getItem: (key: string) => string | null) {
  let mode: string | undefined;
  new Function('localStorage', 'document', colorModeScript)(
    { getItem },
    {
      documentElement: {
        setAttribute: (_: string, value: string) => {
          mode = value;
        }
      }
    }
  );
  return mode;
}

describe('theme preference contract', () => {
  test.each([
    null,
    '',
    '{invalid',
    'null',
    '{}',
    '{"state":{"colorMode":"purple"}}',
    serializeColorModePreference('light'),
    serializeColorModePreference('dark')
  ])('script and parser agree for %s', value => {
    expect(
      runScript(key => {
        expect(key).toBe(STORAGE_KEY);
        return value;
      })
    ).toBe(parseColorModePreference(value) ?? 'light');
  });
  test('preserves the existing persisted shape', () => {
    expect(JSON.parse(serializeColorModePreference('dark'))).toEqual({
      state: { colorMode: 'dark' },
      version: 0
    });
  });
  test('blocked storage uses light', () => {
    expect(
      runScript(() => {
        throw new Error('blocked');
      })
    ).toBe('light');
  });
});
