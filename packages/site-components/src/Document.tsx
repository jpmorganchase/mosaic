/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import NextDocument, { Html, Head, NextScript, Main } from 'next/document';

export type { DocumentProps } from 'next/document';

export class Document extends NextDocument {
  render() {
    return (
      <Html>
        <Head>
          {(this.props as any).muiStyleTags}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
