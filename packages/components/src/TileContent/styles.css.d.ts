import { RecipeVariants } from '@vanilla-extract/recipes';
declare const _default: {
  root: string;
  action: string;
  body: string;
  caption: string;
  columnLayout: string;
  rowLayout: string;
  textContent: string;
};
export default _default;
export declare const eyebrowRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    top: string;
    left: string;
    fullWidth: string;
  };
}>;
export declare type EyebrowVariants = RecipeVariants<typeof eyebrowRecipe>;
export declare const tileImageRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    top: string;
    left: string;
    fullWidth: string;
  };
}>;
export declare type TileImageVariants = RecipeVariants<typeof tileImageRecipe>;
export declare const imageRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    top: string;
    left: string;
    fullWidth: {
      height: '186px';
    };
  };
}>;
export declare type ImageVariants = RecipeVariants<typeof imageRecipe>;
export declare const titleRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    top: {};
    left: {};
    fullWidth: {};
    fitContent: {};
  };
  size: {
    small: string;
    medium: string;
    large: string;
    fullWidth: string;
    fitContent: string;
  };
  hasEyebrow: {
    yes: {};
    no: {};
  };
}>;
export declare type TitleVariants = RecipeVariants<typeof titleRecipe>;
export declare const descriptionRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  size: {
    small: string;
    medium: string;
    large: string;
    fullWidth: string;
    fitContent: string;
  };
}>;
export declare type DescriptionVariants = RecipeVariants<typeof descriptionRecipe>;
export declare const rootRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    left: string;
    top: string;
    fullWidth: string;
  };
}>;
export declare type RootVariants = RecipeVariants<typeof rootRecipe>;
