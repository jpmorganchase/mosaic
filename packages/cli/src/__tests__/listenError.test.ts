import { describe, expect, test, vi } from 'vitest';

vi.mock('@jpmorganchase/mosaic-core', () => ({ default: vi.fn() }));

import { listenErrorMessage } from '../serve';

describe('GIVEN the serve command fails to listen', () => {
  test('WHEN the port is in use THEN the message names the address', () => {
    const err = Object.assign(new Error('listen EADDRINUSE: address already in use'), {
      code: 'EADDRINUSE'
    });
    expect(listenErrorMessage(err, 'localhost', 8080)).toBe(
      '[Mosaic] Unable to listen on localhost:8080: the port is already in use'
    );
  });

  test('WHEN it fails for another reason THEN the message includes the cause', () => {
    const err = Object.assign(new Error('listen EACCES: permission denied'), { code: 'EACCES' });
    expect(listenErrorMessage(err, '0.0.0.0', 80)).toBe(
      '[Mosaic] Unable to listen on 0.0.0.0:80: listen EACCES: permission denied'
    );
  });
});
