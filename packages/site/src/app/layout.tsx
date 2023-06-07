import { Metadata } from 'next';

import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import { StoreProvider } from '@jpmorganchase/mosaic-store';
import { Link, Image } from '@jpmorganchase/mosaic-site-components';

export const metadata: Metadata = {
  title: 'Mosaic'
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>
          <StoreProvider LinkComponent={Link} ImageComponent={Image}>
            {children}
          </StoreProvider>
        </main>
      </body>
    </html>
  );
}
