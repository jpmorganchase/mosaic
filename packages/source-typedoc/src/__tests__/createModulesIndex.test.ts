import createModulesIndex from '../createModulesIndex';

jest.mock('../createContent', () => () => ({ content: 'CONTENT', meta: {} }));

describe('GIVEN createModulesIndex', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('THEN it should create a Modules index', async () => {
    // act
    const result = await createModulesIndex(
      '/docs/product/version/page.html',
      '/docs/product/version/page'
    );
    // assert
    expect(result).toEqual({
      content: 'CONTENT',
      meta: {
        data: {
          api: {
            $ref: '../index#/data/api'
          },
          pageType: 'index',
          title: 'Modules'
        },
        sidebar: {
          exclude: false
        },
        title: 'Modules'
      }
    });
  });
});
