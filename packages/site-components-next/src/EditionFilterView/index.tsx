import type { EditionFilterViewProps } from '@jpmorganchase/mosaic-components';
import { EditionFilterView as UI } from '@jpmorganchase/mosaic-mdx-components';
import { MDXContent } from '../MDXContent';
import { mdxElements } from '../mdx/elements';

export async function EditionFilterView({ view, ...restProps }: EditionFilterViewProps) {
  const formattedView = view.map(item => {
    const formattedDescription = (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /** @ts-ignore Server Component */
      <MDXContent source={item.formattedDescription} components={mdxElements} />
    );

    return item.formattedDescription ? { ...item, formattedDescription } : item;
  });
  return <UI view={formattedView} {...restProps} />;
}
