import type { ComplexStyleRule } from '@vanilla-extract/css';
import { recipe as createRecipe } from '@vanilla-extract/recipes';

type VariantGroups = Record<string, Record<string, ComplexStyleRule | string>>;
type BooleanVariant<T> = T extends 'true' | 'false' ? boolean : T;

/** Public structural return type; inferred recipe internals are not exported by recipes. */
export type ThemeRecipe<Variants extends VariantGroups> = (options?: {
  [Group in keyof Variants]?: BooleanVariant<keyof Variants[Group]>;
}) => string;

export function recipe<Variants extends VariantGroups>(
  options: Parameters<typeof createRecipe<Variants>>[0],
  debugId?: string
): ThemeRecipe<Variants> {
  return createRecipe(options, debugId);
}
