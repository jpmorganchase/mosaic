import TurndownService from 'turndown';

const turndownService = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

const toMarkdown = (html: string) => turndownService.turndown(html);

export default toMarkdown;
