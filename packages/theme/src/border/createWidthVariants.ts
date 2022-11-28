import { borderSprinkles } from './border.css';

const createWidthVariants = () => ({
  borderWidth: {
    none: borderSprinkles({
      borderWidth: 'none'
    }),
    thin: borderSprinkles({
      borderWidth: 'thin'
    }),
    medium: borderSprinkles({
      borderWidth: 'medium'
    }),
    thick: borderSprinkles({
      borderWidth: 'thick'
    })
  },
  borderTopWidth: {
    none: borderSprinkles({
      borderTopWidth: 'none'
    }),
    thin: borderSprinkles({
      borderTopWidth: 'thin'
    }),
    medium: borderSprinkles({
      borderTopWidth: 'medium'
    }),
    thick: borderSprinkles({
      borderTopWidth: 'thick'
    })
  },
  borderRightWidth: {
    none: borderSprinkles({
      borderRightWidth: 'none'
    }),
    thin: borderSprinkles({
      borderRightWidth: 'thin'
    }),
    medium: borderSprinkles({
      borderRightWidth: 'medium'
    }),
    thick: borderSprinkles({
      borderRightWidth: 'thick'
    })
  },
  borderBottomWidth: {
    none: borderSprinkles({
      borderBottomWidth: 'none'
    }),
    thin: borderSprinkles({
      borderBottomWidth: 'thin'
    }),
    medium: borderSprinkles({
      borderBottomWidth: 'medium'
    }),
    thick: borderSprinkles({
      borderBottomWidth: 'thick'
    })
  },
  borderLeftWidth: {
    none: borderSprinkles({
      borderLeftWidth: 'none'
    }),
    thin: borderSprinkles({
      borderLeftWidth: 'thin'
    }),
    medium: borderSprinkles({
      borderLeftWidth: 'medium'
    }),
    thick: borderSprinkles({
      borderLeftWidth: 'thick'
    })
  }
});

export default createWidthVariants;
