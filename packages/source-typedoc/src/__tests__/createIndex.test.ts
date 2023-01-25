import glob from 'fast-glob';

import createIndex from '../createIndex';

jest.mock('fast-glob');

describe('GIVEN createIndex', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('THEN it returns an index for the contents of a directory', async () => {
    // arrange
    glob.sync = jest
      .fn()
      .mockReturnValueOnce([
        '/docs/product/version/classes/file1.html',
        '/docs/product/version/classes/file2.html',
        '/docs/product/version/classes/file3.html',
        '/docs/product/version/classes/file4.html'
      ]);
    // act
    const result = await createIndex(
      '/product/version/classes/index.html',
      '/product/version/classes'
    );
    // assert
    expect(result).toEqual({
      content: `
<div className="typedoc-index-page">
  <section className="tsd-panel-group tsd-index-group">
  <H2>Index</H2>
    <section className="tsd-panel tsd-index-panel">
      <div className="tsd-index-content">
        <div className="tsd-index-section">
          <ul className="tsd-index-list">
            <li className="tsd-kind-classes"><a role="link" className="tsd-kind-icon" href="./classes/file1">file1</a></li>
            <li className="tsd-kind-classes"><a role="link" className="tsd-kind-icon" href="./classes/file2">file2</a></li>
            <li className="tsd-kind-classes"><a role="link" className="tsd-kind-icon" href="./classes/file3">file3</a></li>
            <li className="tsd-kind-classes"><a role="link" className="tsd-kind-icon" href="./classes/file4">file4</a></li>
          </ul>
        </div>
      </div>
    </section>
  </section>
</div>
`,
      meta: {
        data: {
          api: { $ref: '../index#/data/api' },
          link: '/product/version/classes',
          pageType: 'index',
          title: 'Classes'
        },
        layout: 'TypeDoc',
        sidebar: {
          exclude: false
        },
        title: 'Classes'
      }
    });
  });
});
