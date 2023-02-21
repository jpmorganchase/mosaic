import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
export const animation = recipe({
  variants: {
    variant: {
      leftSlideIn: style({
        animation: 'var(--salt-animation-slide-in-left) !important',
        animationDuration: '0.3s !important',
        animationFillMode: 'forwards !important',
        opacity: '1 !important'
      }),
      leftSlideOut: style({
        animation: 'var(--salt-animation-slide-out-left) !important',
        animationDuration: '0.3s !important',
        animationFillMode: 'forwards !important',
        opacity: '1 !important'
      }),
      rightSlideIn: style({
        animation: 'var(--salt-animation-slide-in-right) !important',
        animationDuration: '0.3s !important',
        animationFillMode: 'forwards !important',
        opacity: '1 !important'
      }),
      rightSlideOut: style({
        animation: 'var(--salt-animation-slide-out-right) !important',
        animationDuration: '0.3s !important',
        animationFillMode: 'forwards !important',
        opacity: '1 !important'
      })
    }
  },
  defaultVariants: {
    variant: 'leftSlideIn'
  }
});
export type AnimationVariants = RecipeVariants<typeof animation>;
