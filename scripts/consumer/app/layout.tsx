import type { ReactNode } from 'react';
import { colorModeScript } from '@jpmorganchase/mosaic-store/theme-preference';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
