import type { ComponentProps } from 'react';
import { NextAuthAdapter } from '@jpmorganchase/mosaic-site-components/auth/next-auth';

const props: ComponentProps<typeof NextAuthAdapter> = { loginEnabled: true };
export const adapterContract = (
  <NextAuthAdapter {...props}>Adapter declaration contract</NextAuthAdapter>
);
