import { Open_Sans, PT_Mono } from 'next/font/google';

const ptMono = PT_Mono({
  weight: '400',
  display: 'swap',
  subsets: ['latin'],
  variable: '--salt-typography-fontFamily:'
});
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--salt-typography-fontFamily-code',
  display: 'swap'
});

export default [ptMono.variable, openSans.variable];
