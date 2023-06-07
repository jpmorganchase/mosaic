import classnames from 'classnames';
import { SessionProvider, ThemeProvider, Page404 } from '@jpmorganchase/mosaic-site-components';
import { themeClassName } from '@jpmorganchase/mosaic-theme';

import fontClassNames from './fonts';

export default async function NotFound() {
  return (
    <SessionProvider>
      <ThemeProvider className={classnames(themeClassName, ...fontClassNames)}>
        <Page404
          description="This page does not exist, check the URL"
          links={[{ url: '/mosaic', label: 'Return to Homepage' }]}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
