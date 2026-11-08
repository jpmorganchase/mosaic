/**
 * Tests for `src/instrumentation.ts`: the Node.js server validates its env
 * when it starts and exits on an invalid one in production, and nothing is
 * validated on the edge runtime or during `next build`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { register } from '../instrumentation';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function stubInvalidEnv(nodeEnv: string) {
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  vi.stubEnv('NEXT_PHASE', '');
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.stubEnv('MOSAIC_MODE', 'bogus');
}

describe('register', () => {
  it('stops a production server with an invalid env', async () => {
    stubInvalidEnv('production');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    await register();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '  - MOSAIC_MODE: must be one of active, snapshot-file (got "bogus")'
      )
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('logs the problems and carries on in development', async () => {
    stubInvalidEnv('development');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit');
    await register();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('MOSAIC_MODE: must be one of'));
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('starts a production server with a valid env', async () => {
    stubInvalidEnv('production');
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', 'snapshots/latest');
    const exitSpy = vi.spyOn(process, 'exit');
    await register();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('skips the edge runtime', async () => {
    stubInvalidEnv('production');
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const exitSpy = vi.spyOn(process, 'exit');
    await register();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('skips `next build`', async () => {
    stubInvalidEnv('production');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const exitSpy = vi.spyOn(process, 'exit');
    await register();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
