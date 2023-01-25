import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

import preprocessTree from '../preprocessTree';

describe('GIVEN preProcessTree', () => {
  test('it should remove <html/>', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('Body Children');
    // assert
    expect(result.value).toEqual('<div class="typedoc"><head></head>Body Children</div>');
  });

  test('THEN it should re-parent the footer', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><body>Body Children</body><footer><div class="container"><h2>Legends</h2></div><div class="tsd-legend-group">Legend Children</div></footer></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head>Body Children<footer><h3>Legends</h3><div class="tsd-legend-group">Legend Children</div></footer></div>'
    );
  });

  test('THEN it should re-parent body', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('<html><body>Body Children</body></html>');
    // assert
    expect(result.value).toEqual('<div class="typedoc"><head></head>Body Children</div>');
  });

  test('THEN it should remove anchors from headings', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a aria-label="Permalink" href="#"><h1>H1</h1></a><a class="tsd-anchor" aria-label="Permalink" href="#"><h2>H2</h2></a></html>'
      );
    // assert
    expect(result.value).toEqual('<div class="typedoc"><head></head><h1>H1</h1><h2>H2</h2></div>');
  });

  test('THEN it preserves anchor tags which do not have an href', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/enums/resizeanchor.html'
      })
      .use(rehypeStringify)
      .processSync('<html><a name="marketplaceservicename" class="tsd-anchor"></a></html>');
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a name="marketplaceservicename" class="tsd-anchor"></a></div>'
    );
  });

  test('THEN an anchor can link to itself', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/classes/platformserviceimpl.html'
      })
      .use(rehypeStringify)
      .processSync('<html><a href="platformserviceimpl.html" class="tsd-anchor"></a></html>');
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="#" class="tsd-anchor"></a></div>'
    );
  });

  test('THEN it preserves anchor tags which are external URLs', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/enums/resizeanchor.html'
      })
      .use(rehypeStringify)
      .processSync('<html><a href="http://jpmorgan.com"></a></html>');
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="http://jpmorgan.com"></a></div>'
    );
  });

  test('THEN a link from renamed modules.html inside modules/index.html will create a local anchor', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/modules/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="modules.html#marketplaceservicename" class="tsd-kind-icon">Marketplace<wbr>Service<wbr>Name</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="#marketplaceservicename" class="tsd-kind-icon">Marketplace<wbr>Service<wbr>Name</a></div>'
    );
  });

  test('THEN a link from index.html to enums/resizeanchor.html to enums/resizeanchor.html will create a local anchor', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/enums/resizeanchor.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="resizeanchor.html#bottom_left" class="tsd-kind-icon">Authentication<wbr>Service</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="#bottom_left" class="tsd-kind-icon">Authentication<wbr>Service</a></div>'
    );
  });

  test('THEN a link from index.html to an anchor in interfaces/authenticationservice is prefixed with current directory', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="interfaces/authenticationservice.html#constructor" class="tsd-kind-icon">Authentication<wbr>Service</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="./interfaces/authenticationservice#constructor" class="tsd-kind-icon">Authentication<wbr>Service</a></div>'
    );
  });

  test('THEN a link from index.html to an anchor within modules.html is prefixed with current directory', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="modules.html#fieldselection" class="tsd-kind-icon">Authentication<wbr>Service</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="./modules#fieldselection" class="tsd-kind-icon">Authentication<wbr>Service</a></div>'
    );
  });

  test('THEN a link from index.html to interfaces/action.html is prefixed with current directory', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="interfaces/action.html" class="tsd-kind-icon">Authentication<wbr>Service</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="./interfaces/action" class="tsd-kind-icon">Authentication<wbr>Service</a></div>'
    );
  });

  test('THEN a relative link from one sub-directory to modules.html is re-defined', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/interfaces/Card.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="../modules.html#Card" class="tsd-kind-icon">Authentication<wbr>Service</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="../modules#Card" class="tsd-kind-icon">Authentication<wbr>Service</a></div>'
    );
  });

  test('THEN a relative link from one sub-directory to another is preserved', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/modules/Card.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<html><a href="../interfaces/Card.CardProps.html" class="tsd-kind-icon">Authentication<wbr>Service</a></html>'
      );
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><a href="../interfaces/Card.CardProps" class="tsd-kind-icon">Authentication<wbr>Service</a></div>'
    );
  });

  test('THEN it should reparent code blocks', async () => {
    // act
    const result = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('<html><pre><code>This is a code block</code></pre></html>');
    // assert
    expect(result.value).toEqual(
      '<div class="typedoc"><head></head><pre>This is a code block</pre></div>'
    );
  });

  test('THEN it should replace typedoc styled lists with the blank variant', async () => {
    // act
    const ulResult = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('<html><ul className="tsd-index-list"><li/></ul></html>');
    // assert
    expect(ulResult.value).toEqual(
      '<div class="typedoc"><head></head><ul class="tsd-index-list" variant="blank"><li></li></ul></div>'
    );

    // act
    const liResult = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('<html><ul><li className="tsd-kind-enum-member"/></ul></html>');
    // assert
    expect(liResult.value).toEqual(
      '<div class="typedoc"><head></head><ul variant="blank"><li class="tsd-kind-enum-member"></li></ul></div>'
    );
  });

  test('THEN it should replace typedoc un-styled lists with the document variant', async () => {
    // act
    const ulResult = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('<html><ul className="some-other-style"><li/></ul></html>');
    // assert
    expect(ulResult.value).toEqual(
      '<div class="typedoc"><head></head><ul class="some-other-style" variant="document"><li></li></ul></div>'
    );

    // act
    const liResult = await unified()
      .use(rehypeParse)
      .use(preprocessTree, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync('<html><ul><li className="some-other-style"/></ul></html>');
    // assert
    expect(liResult.value).toEqual(
      '<div class="typedoc"><head></head><ul variant="document"><li class="some-other-style"></li></ul></div>'
    );
  });
});
