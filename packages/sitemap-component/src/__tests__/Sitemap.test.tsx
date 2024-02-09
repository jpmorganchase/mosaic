import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Sitemap } from '../index';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

fetch.disableMocks();

const sitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://mysite.com/mosaic/index</loc>
        <changefreq>weekly</changefreq>
        <priority>0.5</priority>
    </url>
    <url>
        <loc>https://mysite.com/mosaic/pageA</loc>
        <changefreq>weekly</changefreq>
        <priority>0.5</priority>
    </url>
    <url>
        <loc>https://mysite.com/mosaic/pageB</loc>
        <changefreq>weekly</changefreq>
        <priority>0.5</priority>
    </url>
 </urlset>   
`;

const xmlHandler = rest.get('https://mysite.com/sitemap.xml', (_req, res, ctx) => {
  return res(ctx.status(200), ctx.text(sitemap));
});

describe('GIVEN a Sitemap view', () => {
  const server = setupServer();
  beforeAll(() => {
    server.use(xmlHandler);
    server.listen({ onUnhandledRequest: 'warn' });
  });
  afterAll(() => {
    server.close();
  });

  it('THEN it a tree view from a sitemap.xml', async () => {
    // arrange
    render(<Sitemap href="https://mysite.com/sitemap.xml" />);

    // assert
    await waitFor(() => {
      expect(screen.getByText('mosaic')).toBeInTheDocument();
      expect(screen.getByText('pageA')).toBeInTheDocument();
      expect(screen.getByText('pageB')).toBeInTheDocument();
    });
  });
});
