import path from 'path';
import nodeFetch from 'node-fetch';

export const getSharedConfig = async route => {
  const routeBase = path.dirname(route);
  const url = path.join('http://localhost:8080', routeBase, 'shared-config.json');
  const res = await nodeFetch(url);
  const resJson = await res.json();
  return resJson.config;
};
