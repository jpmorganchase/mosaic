import Head from 'next/head';
import { PT_Mono, Open_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { lightMode, darkMode } from '@jpmorganchase/mosaic-theme';

const ptMono = PT_Mono({
  weight: '400',
  display: 'swap',
  subsets: ['latin']
});
const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap'
});

export const HeadWithFontStyles = ({ children }: { children: ReactNode }) => (
  <Head>
    <style>{`
      :root {
        --site-font-family: ${openSans.style.fontFamily};
        --site-font-family-code: ${ptMono.style.fontFamily};
      }

      .salt-theme${lightMode}, .salt-theme${darkMode} {
        --salt-typography-fontFamily: ${openSans.style.fontFamily};
        --salt-typography-fontFamily-code: ${ptMono.style.fontFamily};
      }
    `}</style>
    {children}
  </Head>
);
