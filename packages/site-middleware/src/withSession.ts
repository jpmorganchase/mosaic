import { type NextAuthOptions, getServerSession } from 'next-auth';
import type { Session } from '@jpmorganchase/mosaic-types';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

/**
 *  [[`SessionProps`]] specifies session object containing user profile of logged in user
 */
export interface SessionProps<TUserProfile> {
  session?: Session<TUserProfile>;
}

/**
 *  [[`SessionOptions`]] specifies a configuration object for the withSession middleware
 */
export interface SessionOptions {
  /** is login required for the environment */
  loginRequired: boolean;
  authOptions: NextAuthOptions;
}

/**
 * Adds the [[`Session`]] object to the page props
 * @param context
 * @param options
 */
export const withSession: MosaicMiddleware<SessionProps<unknown>, SessionOptions> = async (
  context,
  options
) => {
  if (process.env.NEXT_PUBLIC_ENABLE_LOGIN !== 'true') {
    return {};
  }
  if (!process.env.NEXTAUTH_SECRET) {
    const errorMessage = '`process.env.NEXTAUTH_SECRET` must be set in environment variables.';
    throw new MiddlewareError(500, context.resolvedUrl, [errorMessage], {
      show500: true
    });
  }

  if (!options?.authOptions) {
    const errorMessage = '`authOptions` must be provided.';
    throw new MiddlewareError(500, context.resolvedUrl, [errorMessage], {
      show500: true
    });
  }

  const session = await getServerSession(context.req, context.res, options.authOptions);

  return {
    props: {
      session: {
        ...session,
        isLoggedIn: session !== null
      }
    }
  };
};
