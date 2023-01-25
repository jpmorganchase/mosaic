import fsPromises from 'fs/promises';
import fs from 'fs';

import createContent from '../createContent';

jest.mock('fs/promises');
jest.mock('fs');

describe('GIVEN createContent', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('THEN it should handle non-existent files', async () => {
    // arrange
    fs.existsSync = jest.fn().mockReturnValueOnce(false);
    // act
    const result = await createContent(
      '/docs/product/version',
      '/docs/product/version/interfaces/page.html',
      '/docs/product/version/interfaces/page'
    );
    // assert
    expect(result).toEqual(null);
  });

  test('THEN it should handle empty files', async () => {
    // arrange
    fs.existsSync = jest.fn().mockReturnValueOnce(false);
    fsPromises.readFile = jest.fn().mockResolvedValueOnce('');
    // act
    const result = await createContent(
      '/docs/product/version',
      '/docs/product/version/interfaces/page.html',
      '/docs/product/version/interfaces/page'
    );
    // assert
    expect(result).toEqual(null);
  });

  test('THEN it should convert Headings to Design Langauge JSX and preserve id+class', async () => {
    // arrange
    fs.existsSync = jest.fn().mockReturnValue(true);
    fsPromises.readFile = jest
      .fn()
      .mockResolvedValueOnce('<h2 class ="my-class" id="my-id">Hello World</h2>');
    // act
    const result = await createContent(
      '/docs/product/version',
      '/docs/product/version/interfaces/page.html',
      '/docs/product/version/interfaces/page'
    );
    // assert
    expect(result).toEqual({
      content:
        '<div><div className="typedoc"><H2 className="my-class" id="my-id">Hello World</H2></div></div>',
      meta: {
        data: {
          link: '/docs/product/version/interfaces/page',
          pageType: 'content',
          sidebarNavOptions: []
        },
        layout: 'TypeDoc',
        sidebar: {
          exclude: true
        }
      }
    });
  });

  test('THEN it should convert Anchors to Design Langauge JSX and preserve id+class', async () => {
    // arrange
    fs.existsSync = jest.fn().mockReturnValue(true);
    fsPromises.readFile = jest
      .fn()
      .mockResolvedValueOnce(
        '<a class ="my-class" id="my-id" href="interfaces/href">Hello World</a>'
      );
    // act
    const result = await createContent(
      '/docs/product/version',
      '/docs/product/version/interfaces/page.html',
      '/docs/product/version/interfaces/page'
    );
    // assert
    expect(result).toEqual({
      content:
        '<div><div className="typedoc"><Link className="my-class" id="my-id" link="../interfaces/href" variant="component">Hello World</Link></div></div>',
      meta: {
        data: {
          link: '/docs/product/version/interfaces/page',
          pageType: 'content',
          sidebarNavOptions: []
        },
        layout: 'TypeDoc',
        sidebar: {
          exclude: true
        }
      }
    });
  });

  test('THEN it should convert Pre to Design Langauge JSX and preserve id+class', async () => {
    // arrange
    fs.existsSync = jest.fn().mockReturnValue(true);
    fsPromises.readFile = jest
      .fn()
      .mockResolvedValueOnce(
        '<pre class ="my-class" id="my-id" href="interfaces/href">Hello World</pre>'
      );
    // act
    const result = await createContent(
      '/docs/product/version',
      '/docs/product/version/interfaces/page.html',
      '/docs/product/version/interfaces/page'
    );
    // assert
    expect(result).toEqual({
      content:
        '<div><div className="typedoc"><Pre className="my-class" code="Hello World" href="interfaces/href" id="my-id" language="tsx" /></div></div>',
      meta: {
        data: {
          link: '/docs/product/version/interfaces/page',
          pageType: 'content',
          sidebarNavOptions: []
        },
        layout: 'TypeDoc',
        sidebar: {
          exclude: true
        }
      }
    });
  });
});
