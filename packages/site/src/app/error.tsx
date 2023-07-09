'use client';

import { useEffect } from 'react';
import classnames from 'classnames';
import {
  ImageProvider,
  Page500,
  SessionProvider,
  StoreProvider,
  ThemeProvider
} from '@jpmorganchase/mosaic-site-components';
import { Button } from '@jpmorganchase/mosaic-components';
import { LayoutProvider } from '@jpmorganchase/mosaic-layouts';
import { themeClassName } from '@jpmorganchase/mosaic-theme';

import fontClassNames from './fonts';

const store = {};
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <SessionProvider>
      <StoreProvider value={store}>
        <ThemeProvider className={classnames(themeClassName, ...fontClassNames)}>
          <ImageProvider>
            <LayoutProvider>
              <Page500 description={error.message}>
                <Button
                  onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                  }
                >
                  Try Again
                </Button>
              </Page500>
            </LayoutProvider>
          </ImageProvider>
        </ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
