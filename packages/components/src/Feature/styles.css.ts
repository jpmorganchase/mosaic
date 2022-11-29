import { style } from '@vanilla-extract/css';
import { neutralBorder, paragraph, responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';

const styles = {
  root: style([
    {
      display: 'flex',
      width: '100%'
    },
    responsiveSprinkles({ flexDirection: ['column', 'column', 'row', 'row'] })
  ]),
  secondaryContentRoot: style([
    {
      alignItems: 'center'
    }
  ]),
  primaryContentRoot: style([
    {
      alignItems: 'start'
    }
  ]),
  content: style([paragraph({ variant: 'paragraph2' })]),
  leftImageRoot: style([
    { justifyContent: 'flex-end' },
    responsiveSprinkles({
      flexDirection: ['column', 'column', 'row-reverse', 'row-reverse']
    })
  ]),
  rightImageRoot: style([
    { justifyContent: 'space-between' },
    responsiveSprinkles({ flexDirection: ['column', 'column', 'row', 'row'] })
  ]),
  leftImage: responsiveSprinkles({
    paddingTop: ['x6', 'x6', 'none', 'none'],
    marginRight: ['x6', 'x6', 'x6', 'x6']
  }),
  rightImage: responsiveSprinkles({
    paddingTop: ['x6', 'x6', 'none', 'none'],
    marginLeft: ['x6', 'x6', 'x6', 'x6']
  }),
  highlightBar: style([
    {
      width: '40px',
      height: '5px',
      backgroundColor: vars.color.light.neutral.foreground.low
    },
    neutralBorder({ variant: 'low', borderBottomWidth: 'thick' }),
    responsiveSprinkles({ marginBottom: ['x4', 'x4', 'x4', 'x4'] })
  ]),
  image: style([
    {
      height: '340px',
      width: '415px'
    }
  ])
};

export default styles;
