import { describe, it, beforeAll, afterAll, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sitemap } from '../index';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

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

const server = setupServer(
  http.get('https://mysite.com/sitemap.xml', () => {
    return HttpResponse.text(sitemap);
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});

describe('GIVEN a Sitemap view', () => {
  it('THEN it a tree view from a sitemap.xml', async () => {
    // arrange
    render(<Sitemap href="https://mysite.com/sitemap.xml" />);

    expect(await screen.findByText('mosaic')).toBeInTheDocument();
    expect(await screen.findByText('pageA')).toBeInTheDocument();
    expect(await screen.findByText('pageB')).toBeInTheDocument();
  });
});
