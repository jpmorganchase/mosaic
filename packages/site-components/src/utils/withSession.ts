import { GetServerSidePropsContext } from 'next';
import { validateIdaToken } from '@uiservices/node-common';
import { getSessionFromToken, getToken, getIsCypressSession } from '../session';
import type { Session } from '../types/session';
import { MosaicMiddleware } from './createMiddlewareRunner';
import MiddlewareError from './MiddlewareError';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

/**
 *  [[`SessionProps`]] specifies session object containing user profile of logged in user
 */
export interface SessionProps {
  session?: Session;
}

/**
 *  [[`SessionOptions`]] specifies a configuration object for the withSession middleware
 */
export interface SessionOptions {
  /** is login required for the environment */
  loginRequired: boolean;
}

const getRedirectOptions = (context: GetServerSidePropsContext) => {
  const url = new URL(
    `${process.env.HOSTNAME?.replace(/\/$/, '')}/${context.resolvedUrl.replace(/^\//, '')}`
  );

  if (url.search.includes('code=')) {
    throw new Error(
      'Authorisation loop detected. `code` should never appear in the client query string.'
    );
  }
  url.searchParams.delete('namespace');
  url.searchParams.delete('slug');
  return {
    redirect: {
      destination: `/api/auth/login?referrer=${encodeURIComponent(`${url.pathname}${url.search}`)}`,
      permanent: false
    }
  };
};

async function resolveSession(accessToken) {
  return (
    accessToken &&
    (process.env.DISABLE_IDA_SERVICE_AUTH_TOKEN_VERIFICATION === 'true' ||
      (await validateIdaToken(accessToken))) &&
    (getSessionFromToken(accessToken) as Session)
  );
}

/**
 * Adds the [[`Session`]] object to the page props
 * @param context
 * @param options
 */
export const withSession: MosaicMiddleware<SessionProps, SessionOptions> = async (
  context,
  options
) => {
  if (process.env.ENABLE_LOGIN !== 'true') {
    return {};
  }
  if (!process.env.COOKIE_SECRET) {
    const errorMessage = '`process.env.COOKIE_SECRET` must be set in environment variables.';
    throw new MiddlewareError(500, context.resolvedUrl, [errorMessage], {
      show500: true
    });
  }
  const accessToken = getToken(context.req);
  const isCypressSession = getIsCypressSession(context.req);
  const session = await resolveSession(accessToken);
  // Do the middleware options have `loginRequired` true?
  const isRedirectEnabled = options?.loginRequired;
  const isLoggedIn = !!(
    accessToken &&
    session &&
    // If session remaining time is <15m we'll request a re-login
    isSessionRemainingMoreThan(session, 900000 /* 15 mins */)
  );
  if (isRedirectEnabled && !isLoggedIn) {
    return getRedirectOptions(context);
  }

  return {
    props: {
      session: {
        ...session,
        isLoggedIn,
        accessToken,
        isCypressSession
      }
    }
  };
};

function isSessionRemainingMoreThan(session: Session, minRemainingTime = 1800000 /* 30 mins */) {
  const { expires = 0 } = session;
  return expires >= Date.now() + minRemainingTime;
}
