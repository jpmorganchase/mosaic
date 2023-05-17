/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import NextDocument, { Html, Head, NextScript, Main } from 'next/document';

export type { DocumentProps } from 'next/document';

export class Document extends NextDocument {
  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
