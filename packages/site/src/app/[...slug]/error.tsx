'use client';

import { useEffect } from 'react';
import { Button } from '@jpmorganchase/mosaic-components';
import { Page500 } from '@jpmorganchase/mosaic-site-components';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <Page500 description={error.message} title="Page Error">
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try Again
      </Button>
    </Page500>
  );
}
