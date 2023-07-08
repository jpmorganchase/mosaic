import { Metadata } from 'next';

import '@jpmorganchase/mosaic-site-preset-styles/index.css';

export const metadata: Metadata = {
  title: 'Mosaic'
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
