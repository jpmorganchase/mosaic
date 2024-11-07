import { CompileOptions, compile } from '../actions/compile';

export type MDXContentProps = CompileOptions;

export async function MDXContent(props: MDXContentProps) {
  if (props.source === undefined) {
    return null;
  }

  const content = await compile(props);
  return content;
}
