import { getJavascriptWebToken } from '@uiservices/node-common';
import type { Session } from '@dpmosaic/site-components';
import { createSession, getSessionFromToken } from '@dpmosaic/site-components/dist/session';

if (
  !process.env.ADFS_CALLBACK_DOMAIN ||
  !process.env.ADFS_CLIENT_ID ||
  !process.env.ADFS_RESOURCE_URI ||
  !process.env.ADFS_URL ||
  !process.env.ADFS_TOKEN_URI ||
  !process.env.COOKIE_SECRET
) {
  throw new Error(
    '`ADFS_CALLBACK_DOMAIN`, `COOKIE_SECRET`, `ADFS_CLIENT_ID`, `ADFS_RESOURCE_URI`, `ADFS_URL` and `ADFS_TOKEN_URI` must ALL be set in environment variables.'
  );
}

const handleIdToken = async (req, res) => {
  try {
    const {
      data: { access_token: accessToken }
    } = await getJavascriptWebToken(req.query.code);
    const referrer = (req.query.referrer && decodeURIComponent(req.query.referrer)) || '/';
    // Referrer allowed: /case-studies/blah /products /
    // Referrer disallowed: /api/ http://www.dodgyurldonotvisit.org.uk /api
    const isReferrerSafe = /^\/(?!api(\/|$)).*/.test(referrer);
    if (!accessToken) {
      throw new Error('Access Token missing from request.');
    }

    const session = getSessionFromToken(accessToken) as Session;
    createSession(res, accessToken, session.expires);

    const path = isReferrerSafe ? referrer : '/';
    return res.redirect(path);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error processing OAuth Code.');
  }
};

export default handleIdToken;
