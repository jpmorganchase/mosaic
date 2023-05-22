import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import remarkDirective from 'remark-directive';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

interface PropsTablePluginPage extends Page {
  props?: any;
}

/**
 *
 */
const PropsTablePlugin: PluginType<PropsTablePluginPage> = {
  async $afterSource(pages) {
    const processor = remark().use(remarkDirective);
    for (const page of pages) {
      const tree: any = await processor.parse(page.content);

      visit(
        tree,
        node => node.type === 'textDirective',
        node => {
          if (node.name !== 'propsTable') return;

          // TODO remove log
          console.log('$afterSource -> node.attributes.source', node.attributes.src);

          // TODO replace this dummy data with the actual data from the source
          const propsTableData = {
            disabled: {
              defaultValue: null,
              description: 'If `true`, the button will be disabled.',
              name: 'disabled',
              parent: {
                fileName: 'salt-ds/packages/core/src/button/Button.tsx',
                name: 'ButtonProps'
              },
              declarations: [
                {
                  fileName: 'salt-ds/packages/core/src/button/Button.tsx',
                  name: 'ButtonProps'
                }
              ],
              required: false,
              type: {
                name: 'boolean'
              }
            },
            focusableWhenDisabled: {
              defaultValue: null,
              description: 'If `true`, the button will be focusable when disabled.',
              name: 'focusableWhenDisabled',
              parent: {
                fileName: 'salt-ds/packages/core/src/button/Button.tsx',
                name: 'ButtonProps'
              },
              declarations: [
                {
                  fileName: 'salt-ds/packages/core/src/button/Button.tsx',
                  name: 'ButtonProps'
                }
              ],
              required: false,
              type: {
                name: 'boolean'
              }
            },
            variant: {
              defaultValue: {
                value: 'primary'
              },
              description:
                "The variant to use. Options are 'primary', 'secondary' and 'cta'.\n'primary' is the default value.",
              name: 'variant',
              parent: {
                fileName: 'salt-ds/packages/core/src/button/Button.tsx',
                name: 'ButtonProps'
              },
              declarations: [
                {
                  fileName: 'salt-ds/packages/core/src/button/Button.tsx',
                  name: 'ButtonProps'
                }
              ],
              required: false,
              type: {
                name: '"primary" | "secondary" | "cta"'
              }
            }
          };

          // Creates a markdown table using the data (could create nodes or something here but this was simplest)
          const propsTableKeys = Object.keys(propsTableData);
          // TODO Make this table the way you want it - it's a little messed up for some reason
          const tableMarkdown = `
| Name      | Description                                       | Type     | Default Value | Required |
|-----------|---------------------------------------------------|----------|---------------|----------|
${propsTableKeys
  .map(key => {
    const prop = propsTableData[key];
    return `| ${prop.name} | ${prop.description} | ${prop.type.name} | ${
      prop.defaultValue ?? '-'
    } | ${prop.required ? 'Yes' : 'No'} |`;
  })
  .join('\n')}
`;

          // Replaces the current node with a new text node containing the table
          node.type = 'text';
          node.value = tableMarkdown;
        }
      );

      page.content = remark()
        .data('settings', { fences: true })
        .use(remarkDirective)
        .stringify(tree);
    }

    return pages;
  }
};

export default PropsTablePlugin;
