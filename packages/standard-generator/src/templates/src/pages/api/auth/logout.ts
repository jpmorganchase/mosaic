import { clearSession } from '@jpmorganchase/mosaic-site-components/dist/session';

const login = (_, res) => {
  clearSession(res);
  res.redirect('/');
};

export default login;
