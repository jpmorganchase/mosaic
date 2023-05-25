import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import { parse } from 'react-docgen-typescript';
import type { Node } from 'unist';

const options = {
  propFilter: prop => !/@types[\\/]react[\\/]/.test(prop.parent?.fileName || '')
};

type LeafNode = Node & {
  value: string;
  name: string;
  attributes: { src: string };
  children: Record<string, any>;
};

interface PropsTablePluginPage extends Page {
  content: string;
}

const PropsTablePlugin: PluginType<PropsTablePluginPage> = {
  // TODO: add support for active mode
  async $afterSource(pages) {
    const processor = remark().use(remarkDirective).use(remarkGfm);
    for (const page of pages) {
      const tree = await processor.parse(page.content);

      visit(
        tree as Node,
        (node: Node) => node.type === 'textDirective',
        (node: LeafNode) => {
          if (node.name !== 'propsTable') return;

          const propsTableData = parse(node.attributes.src, options)[0].props;

          const tableHeaders = {
            type: 'tableRow',
            children: [
              {
                type: 'tableCell',
                children: [{ type: 'text', value: 'Name' }]
              },
              {
                type: 'tableCell',
                children: [{ type: 'text', value: 'Type' }]
              },
              {
                type: 'tableCell',
                children: [{ type: 'text', value: 'Description' }]
              },
              {
                type: 'tableCell',
                children: [{ type: 'text', value: 'Default' }]
              }
            ]
          };

          const tableBody = Object.values(propsTableData).map(
            ({ name, type, description, defaultValue }) => ({
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [{ type: 'text', value: name }]
                },
                {
                  type: 'tableCell',
                  children: [{ type: 'inlineCode', value: type.name }]
                },
                {
                  type: 'tableCell',
                  children: [{ type: 'html', value: description.replace(/\n/g, ' ') }]
                },
                {
                  type: 'tableCell',
                  children: [{ type: 'inlineCode', value: defaultValue ? defaultValue.value : '-' }]
                }
              ]
            })
          );

          const table = [tableHeaders, ...tableBody];

          // Replaces the current node with a new table node containing the props
          node.type = 'table';
          node.children = table;
        }
      );

      page.content = remark()
        .data('settings', { fences: true })
        .use(remarkDirective)
        .use(remarkGfm)
        .stringify(tree);
    }

    return pages;
  }
};

export default PropsTablePlugin;
