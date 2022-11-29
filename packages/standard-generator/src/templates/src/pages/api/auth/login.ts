import { generateRedirectUrl } from '@uiservices/node-common';

const login = (req, res) => {
  if (!process.env.COOKIE_SECRET) {
    throw new Error('`process.env.COOKIE_SECRET` must be set in environment variables.');
  }
  if (!res) {
    throw new Error('`response` not passed to login api function.');
  }

  try {
    return res.redirect(
      generateRedirectUrl({
        state: Buffer.from(
          JSON.stringify({
            dev: process.env.NODE_ENV === 'development',
            prId: process.env.NEXT_PUBLIC_PR_DEPLOYMENT_ID,
            referrer: req.query?.referrer || '/'
          }),
          'ascii'
        ).toString('base64')
      })
    );
  } catch (e) {
    console.error(e);
    return res.status(500).send('Error preparing token redirect.');
  }
};

export default login;
