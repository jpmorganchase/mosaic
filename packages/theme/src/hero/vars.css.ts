const defaultHeroVars = {
  frame: {
    minWidth: '415px',
    minHeight: '340px'
  },
  frameImage: {
    width: '205px',
    height: '205px',
    top: '67px',
    left: '105px'
  },
  frameBackgroundImage: {
    width: '100%',
    height: '100%'
  }
};

type HeroVars = typeof defaultHeroVars;

export const heroVars: HeroVars = defaultHeroVars;
