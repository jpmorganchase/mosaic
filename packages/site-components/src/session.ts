import cookie from 'node-cookie';
import decode from 'jwt-decode';

import { Session, JWT } from './types/session';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

const cookieSecret = process.env.COOKIE_SECRET;
const isCookieSecretSet = !!cookieSecret;
const TOKEN_COOKIE_NAME = 'access_token';
const DEFAULT_COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development',
  sameSite: 'lax',
  path: '/'
};

export function getToken(req): string | null {
  if (!req) {
    return null;
  }

  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  return cookie.get(req, TOKEN_COOKIE_NAME, cookieSecret, isCookieSecretSet);
}

export function getIsCypressSession(req): boolean {
  if (!req) {
    return false;
  }

  return Boolean(req.headers?.cypresse2e === 'true');
}

export function clearSession(res) {
  if (!res) {
    throw new Error('Cannot clear session - response object invalid');
  }
  return cookie.clear(res, TOKEN_COOKIE_NAME, DEFAULT_COOKIE_CONFIG);
}

export function isSessionAgeMoreThan(session: Session, minRemainingTime = 0) {
  const { expires = 0 } = session;
  return expires >= Date.now() + minRemainingTime;
}

// eslint-disable-next complexity
export function getSessionFromToken(accessToken): Session | null {
  try {
    if (!accessToken) {
      throw new Error('No token provided');
    }

    const decodedToken = decode(accessToken) as JWT;

    if (!decodedToken) {
      throw new Error('Invalid token');
    }

    const {
      exp = -1,
      UserID = '',
      JPMCIdentifier = '',
      UID = '',
      EmployeeCorporateID = '',
      CostCenter = '',
      Country = '',
      CountryCode = '',
      Department = '',
      DisplayName = '',
      Email = '',
      EmployeeType = '',
      FirstName = '',
      LastName = '',
      LOB = '',
      LocationCode = ''
    } = decodedToken;
    if (decodedToken) {
      const expires = exp * 1000;

      if (expires < Date.now()) {
        return null;
      }

      const sid = UserID || JPMCIdentifier || UID || EmployeeCorporateID;
      return {
        expires,
        isLoggedIn: true,
        accessToken,
        user: {
          avatarUrl: process.env.AVATAR_URL,
          sid,
          country: Country,
          countryCode: CountryCode,
          costCenter: CostCenter,
          department: Department,
          displayName: DisplayName,
          email: Email,
          employeeType: EmployeeType,
          firstName: FirstName,
          lastName: LastName,
          lob: LOB,
          locationCode: LocationCode
        }
      };
    }
    throw new Error('Could not decode token');
  } catch (e) {
    console.error(e);
  }

  return null;
}

export function createSession(res, accessToken, expires) {
  return cookie.create(
    res,
    TOKEN_COOKIE_NAME,
    accessToken,
    {
      ...DEFAULT_COOKIE_CONFIG,
      maxAge: (expires - new Date().getTime()) / 1000
    },
    cookieSecret,
    isCookieSecretSet
  );
}
