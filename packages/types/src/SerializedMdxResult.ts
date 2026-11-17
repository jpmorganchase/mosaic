/**
 * Compiled MDX payload shared by Mosaic's server serializer, editor preview,
 * and client renderer. This is structurally compatible with the serializer's
 * result without exposing its JSX-runtime-specific declaration dependencies.
 */
export type SerializedMdxResult<
  TFrontmatter = Record<string, unknown>,
  TScope = Record<string, unknown>
> = ({ compiledSource: string } | { error: Error }) & {
  frontmatter: TFrontmatter;
  scope: TScope;
};
