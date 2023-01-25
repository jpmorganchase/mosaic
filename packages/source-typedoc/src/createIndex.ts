import path from 'path';

import glob from 'fast-glob';
import sanitizeHtml from 'sanitize-html';
import type { PageDescriptor } from '@jpmorganchase/mosaic-types';

function formatTextWithWordBreaks(text) {
  let formattedText = text.replace(/([a-z])([A-Z])/g, '$1<wbr />$2');
  formattedText = formattedText.replace(/([A-Z])([A-Z][a-z])/g, '$1<wbr />$2');
  return sanitizeHtml(formattedText);
}

const createIndex: PageDescriptor = (pagePath: string, route: string) => {
  const contentRoot = path.dirname(pagePath);
  const pathMatches = pagePath.match(/.*[/\\](.+?)[/\\]index.html$/);
  const typeDoc = pathMatches && pathMatches.length > 1 ? pathMatches[1] : 'unknown';

  const globbedFiles = glob.sync('*.html', {
    absolute: true,
    cwd: contentRoot
  });
  const typeDocElements = globbedFiles.map(typeDocFile => {
    const typeDocBasename = path.basename(typeDocFile, '.html');
    const linkLabel = formatTextWithWordBreaks(typeDocBasename);
    return `            <li className="tsd-kind-${typeDoc}"><a role="link" className="tsd-kind-icon" href="./${typeDoc}/${typeDocBasename}">${linkLabel}</a></li>`;
  });
  const title = sanitizeHtml(`${typeDoc[0].toUpperCase()}${typeDoc.substring(1)}`);
  const content = `
<div className="typedoc-index-page">
  <section className="tsd-panel-group tsd-index-group">
  <H2>Index</H2>
    <section className="tsd-panel tsd-index-panel">
      <div className="tsd-index-content">
        <div className="tsd-index-section">
          <ul className="tsd-index-list">
${typeDocElements.join('\n')}
          </ul>
        </div>
      </div>
    </section>
  </section>
</div>
`;

  const meta = {
    data: {
      api: {
        $ref: '../index#/data/api'
      },
      link: route,
      pageType: 'index',
      title
    },
    layout: 'TypeDoc',
    sidebar: { exclude: false },
    title
  };

  return {
    content,
    meta
  };
};

export default createIndex;
