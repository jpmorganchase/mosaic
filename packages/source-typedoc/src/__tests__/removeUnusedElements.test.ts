import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

import removeUnusedElements from '../removeUnusedElements';

describe('GIVEN removeUnusedElements', () => {
  test('THEN it should remove unused elements', async () => {
    // act
    const result = await unified()
      .use(rehypeParse, { fragment: true })
      .use(removeUnusedElements, {
        contentRoot: '/developer/apis/platform-api/papi/2.17.43',
        pagePath: '/developer/apis/platform-api/papi/2.17.43/index.html'
      })
      .use(rehypeStringify)
      .processSync(
        '<!DOCTYPE html><html><head><style>Style Children</style></head><script>Script Children</script><header>Header Children<h1>Header H1</h1></header><body>Body Children<div class="tsd-generator">TSD Generator Children</div><div class="overlay">Overlay Children</div><dt>example</dt><svg class="icon-tabler-link">SVG CHILDREN</svg></body></html>'
      );
    // assert
    expect(result.value).toEqual('<header>Header Children<h1>Header H1</h1></header>Body Children');
  });
});
