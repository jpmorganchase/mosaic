import { rest } from 'msw';

export const postSaveContentSuccessHandler = rest.post('/api/content/save', (req, res, ctx) =>
  res(ctx.status(500), ctx.json({ links: { self: [{ href: 'http://pull-request-url' }] } }))
);

export const postSaveContentFailureHandler = rest.post('/api/content/save', (req, res, ctx) =>
  res(ctx.status(500))
);
