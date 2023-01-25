import createRootIndex from '../createRootIndex';

jest.mock('../createContent', () => () => ({
  content: '<H1 class="my-class">MODULE NAME</H1>CONTENT',
  meta: {}
}));

describe('GIVEN createRootIndex', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('THEN it should create a Root index', async () => {
    // act
    const result = await createRootIndex(
      '/docs/product/VERSION',
      '/docs/product/VERSION/index.html',
      '/docs/product/VERSION',
      { additionalProp: 'additionalPropValue' }
    );
    // assert
    expect(result).toEqual({
      content: 'CONTENT',
      meta: {
        data: {
          api: {
            additionalProp: 'additionalPropValue',
            name: 'MODULE NAME',
            version: 'VERSION'
          },
          pageType: 'root',
          title: 'MODULE NAME'
        },
        sidebar: {
          exclude: false,
          label: 'VERSION'
        },
        title: 'MODULE NAME'
      }
    });
  });
});
