import Head from 'next/head';

import '@jpmorganchase/mosaic-site-preset-styles/index.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <title>Some title</title>
      </Head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
