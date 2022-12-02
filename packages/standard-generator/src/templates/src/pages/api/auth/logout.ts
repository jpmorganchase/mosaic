import { clearSession } from '@dpmosaic/site-components/dist/session';

const login = (_, res) => {
  clearSession(res);
  res.redirect('/');
};

export default login;
