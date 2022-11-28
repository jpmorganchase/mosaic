const dpList = {
  unordered: {
    document: {
      small: {
        size: '14px',
        level1: { url: 'url( img_bullet_circle1.svg)' },
        level2: { url: 'url(img_bullet_ring.svg)' },
        level3: { url: 'url(img_bullet_square.svg)' }
      },
      medium: {
        size: '16px',
        level1: { url: 'url( img_bullet_circle1.svg)' },
        level2: { url: 'url(img_bullet_ring.svg)' },
        level3: { url: 'url(img_bullet_square.svg)' }
      },
      large: {
        size: '18px',
        level1: { url: 'url( img_bullet_circle1.svg)' },
        level2: { url: 'url(img_bullet_ring.svg)' },
        level3: { url: 'url(img_bullet_square.svg)' }
      }
    },
    regular: {
      small: {
        size: '14px',
        level1: { url: 'url( img_bullet_circle1.svg)' },
        level2: { url: 'url(img_bullet_ring.svg)' },
        level3: { url: 'url(img_bullet_square.svg)' }
      },
      medium: {
        size: '16px',
        level1: { url: 'url( img_bullet_circle1.svg)' },
        level2: { url: 'url(img_bullet_ring.svg)' },
        level3: { url: 'url(img_bullet_square.svg)' }
      },
      large: {
        size: '18px',
        level1: { url: 'url( img_bullet_circle1.svg)' },
        level2: { url: 'url(img_bullet_ring.svg)' },
        level3: { url: 'url(img_bullet_square.svg)' }
      }
    },
    image: {
      small: {
        size: '20px',
        level1: { url: 'url(img_bullet_circle2.svg)' },
        level2: { url: 'url(img_bullet_circle2.svg)' },
        level3: { url: 'url(img_bullet_circle2.svg)' }
      },
      medium: {
        size: '40px',
        level1: { url: 'url(img_bullet_circle2.svg)' },
        level2: { url: 'url(img_bullet_circle2.svg)' },
        level3: { url: 'url(img_bullet_circle2.svg)' }
      },
      large: {
        size: '60px',
        level1: { url: 'url(img_bullet_circle2.svg)' },
        level2: { url: 'url(img_bullet_circle2.svg)' },
        level3: { url: 'url(img_bullet_circle2.svg)' }
      }
    }
  }
};

type ListVars = typeof dpList;

export const listVars: ListVars = dpList;
