import { RecipeVariants } from '@vanilla-extract/recipes';
export declare const tileImageRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    left: {
      width: '100px';
      height: '100px';
    };
    fullWidth: string;
  };
}>;
export declare type TileImageVariants = RecipeVariants<typeof tileImageRecipe>;
export declare const imageRecipe: import('@vanilla-extract/recipes/dist/declarations/src/types').RuntimeFn<{
  imagePlacement: {
    left: string;
    fullWidth: {
      width: '100%';
      height: '186px';
    };
  };
}>;
export declare type ImageVariants = RecipeVariants<typeof imageRecipe>;
declare const _default: {
  root: string;
  content: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
};
export default _default;
