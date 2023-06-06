import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { remark } from 'remark';
import { visitParents } from 'unist-util-visit-parents';
import { parse } from 'react-docgen-typescript';
import type { Node } from 'unist';
// import fetch from 'node-fetch';

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

async function getProps(src) {
  // const response = await fetch(src);
  // const fileContent = await response.text();
  const fileContent = `import { ComponentPropsWithoutRef, forwardRef, ReactElement } from "react";
  import { clsx } from "clsx";
  import { useComponentCssInjection } from "@salt-ds/styles";
  import { useWindow } from "@salt-ds/window";
  import { makePrefixer } from "../utils";
  
  import buttonCss from "./Button.css";
  import { useButton } from "./useButton";
  
  const withBaseName = makePrefixer("saltButton");
  
  export const ButtonVariantValues = ["primary", "secondary", "cta"] as const;
  export type ButtonVariant = typeof ButtonVariantValues[number];
  
  export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    /**
     * If \`true\`, the button will be disabled.
     */
    disabled?: boolean;
    /**
     * If \`true\`, the button will be focusable when disabled.
     */
    focusableWhenDisabled?: boolean;
    /**
     * The variant to use. Options are 'primary', 'secondary' and 'cta'.
     * 'primary' is the default value.
     */
    variant?: ButtonVariant;
  }
  
  export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    function Button(
      {
        children,
        className,
        disabled,
        focusableWhenDisabled,
        onKeyUp,
        onKeyDown,
        onBlur,
        onClick,
        type = "button",
        variant = "primary",
        ...restProps
      },
      ref?
    ): ReactElement<ButtonProps> {
      const { active, buttonProps } = useButton({
        disabled,
        focusableWhenDisabled,
        onKeyUp,
        onKeyDown,
        onBlur,
        onClick,
      });
  
      const targetWindow = useWindow();
      useComponentCssInjection({
        testId: "salt-button",
        css: buttonCss,
        window: targetWindow,
      });
  
      // we do not want to spread tab index in this case because the button element
      // does not require tabindex="0" attribute
      const { tabIndex, ...restButtonProps } = buttonProps;
      return (
        <button
          {...restButtonProps}
          className={clsx(
            withBaseName(),
            withBaseName(variant),
            {
              [withBaseName("disabled")]: disabled,
              [withBaseName("active")]: active,
            },
            className
          )}
          {...restProps}
          ref={ref}
          type={type}
        >
          {children}
        </button>
      );
    }
  );`;
  console.log({ fileContent });
  const docgenData = parse(fileContent, options);
  console.log({ docgenData });

  // If there is no valid data, return an empty object
  if (!docgenData[0]) {
    console.warn(`Warning: Unable to parse data from ${src}`);
    return {};
  }

  const propsTableData = docgenData[0].props;
  return propsTableData;
}

const PropsTablePlugin: PluginType<PropsTablePluginPage> = {
  // TODO: add support for active mode
  async $afterSource(pages) {
    const processor = remark().use(remarkDirective).use(remarkGfm);
    for (const page of pages) {
      const tree = await processor.parse(page.content);

      // Collect all additional promises here
      const additionalPromises = [];

      visitParents(tree, 'textDirective', (node: LeafNode, _ancestors: Node[]) => {
        if (node.name !== 'propsTable') return;

        console.log(node.attributes.src);

        const promise = getProps(node.attributes.src).then(propsTableData => {
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
        });

        additionalPromises.push(promise);
      });

      // Wait for all additional promises to resolve
      await Promise.all(additionalPromises);

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
