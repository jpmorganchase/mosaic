import { withHeroAdapter } from './withHeroAdapter';
import { Hero as OriginalHero } from './Hero';

export { withHeroAdapter } from './withHeroAdapter';
export const Hero = withHeroAdapter(OriginalHero);
