import { fileURLToPath } from 'node:url';
import { firstValueFrom } from 'rxjs';
import { describe, expect, test } from 'vitest';

import createSourceObservable from '../createSourceObservable.js';

function workerData(fixture: string) {
  return {
    modulePath: fileURLToPath(new URL(`./fixtures/${fixture}.ts`, import.meta.url)),
    name: fixture,
    namespace: 'docs',
    options: {},
    pageExtensions: ['.mdx'],
    ignorePages: ['shared-config.json'],
    schedule: { checkIntervalMins: 30, initialDelayMs: 0 }
  };
}

describe('GIVEN createSourceObservable', () => {
  test('THEN capabilities written into page content are removed when the source declares none', async () => {
    const source$ = await createSourceObservable(
      workerData('sourceWithoutCapabilities') as never,
      {}
    );

    const [page] = await firstValueFrom(source$);

    expect(page).not.toHaveProperty('sourceCapabilities');
  });

  test("THEN the source's declared capabilities replace any written into page content", async () => {
    const source$ = await createSourceObservable(workerData('sourceWithCapabilities') as never, {});

    const [page] = await firstValueFrom(source$);

    expect(page.sourceCapabilities).toEqual({ writable: false });
  });
});
