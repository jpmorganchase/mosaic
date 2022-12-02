import fetch from 'node-fetch';

const supportedDomains = ['AD', 'ADDEV', 'EMEA', 'EMEADEV'];

function serializeBody(body) {
  const formBody = Object.keys(body).reduce(
    (result, property) =>
      `${result && '&'}${encodeURIComponent(property)}=${encodeURIComponent(body[property])}`,
    ''
  );
  return formBody;
}

/**
 * Service to issue tokens. This can be used by third-party services like search and metrics.
 * Tokens can be passed to any page using an `Authorization` header with `Bearer <TOKEN>`
 */
const issue = async (req, res) => {
  if (process.env.TOKEN_ISSUER_ENABLED !== 'true') {
    throw new Error('Token issuer is not enabled for this environment.');
  }
  if (!req.body.username || !req.body.password || !req.body.domain) {
    return res.status(400).send('Missing fields. Required: username, password, domain');
  }
  const domain = req.body.domain.toUpperCase();
  if (supportedDomains.indexOf(domain) === -1) {
    return res
      .status(400)
      .send(`Invalid domain. Available options: ${supportedDomains.join(', ')}`);
  }

  if (
    !process.env.ADFS_CALLBACK_DOMAIN ||
    !process.env.ADFS_CLIENT_ID ||
    !process.env.ADFS_RESOURCE_URI ||
    !process.env.ADFS_URL ||
    !process.env.ADFS_TOKEN_URI
  ) {
    throw new Error(
      '`ADFS_CALLBACK_DOMAIN`, `ADFS_CLIENT_ID`, `ADFS_RESOURCE_URI`, `ADFS_URL` and `ADFS_TOKEN_URI` must ALL be set in environment variables.'
    );
  }

  const authUrl = new URL(process.env.ADFS_URL);
  authUrl.pathname = process.env.ADFS_TOKEN_URI;
  const response = await fetch(authUrl.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    },
    body: serializeBody({
      // eslint-disable-next-line camelcase
      grant_type: 'password',
      username: `${domain}\\${req.body.username}`,
      password: req.body.password,
      // eslint-disable-next-line camelcase
      response_mode: 'query',
      // eslint-disable-next-line camelcase
      client_id: process.env.ADFS_CLIENT_ID,
      resource: process.env.ADFS_RESOURCE_URI
    })
  });
  if (response.ok) {
    const { expires_in: expiresMs, access_token: token } = await response.json();
    res.json({ expiresMs: expiresMs * 1000, token });
    return undefined;
  }
  const { error_description: reason = response.statusText } = await response.json();
  return res.status(401).send(reason);
};

export default issue;
