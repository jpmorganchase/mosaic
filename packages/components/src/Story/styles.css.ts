import { style } from '@vanilla-extract/css';
import { gutterElement, responsiveSprinkles, story } from '@jpmorganchase/mosaic-theme';

const styles = {
  root: style([
    {
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    },
    responsiveSprinkles({ marginTop: ['x10', 'x10', 'x10', 'x10'] })
  ]),
  primaryHeading: story.primaryHeading,
  secondaryHeading: style([story.secondaryHeading, gutterElement({ variant: 'accent' })]),
  primarySubtitle: story.primarySubtitle,
  secondarySubtitle: story.secondarySubtitle,
  image: style([
    {
      width: '100%',
      marginLeft: 'auto',
      marginRight: 'auto',
      maxWidth: '800px'
    },
    responsiveSprinkles({
      marginTop: ['x4', 'x4', 'x4', 'x4'],
      marginBottom: ['x6', 'x6', 'x6', 'x6']
    })
  ]),
  readMore: style([
    { marginLeft: 'auto', marginRight: 'auto' },
    responsiveSprinkles({
      marginTop: ['x4', 'x4', 'x4', 'x4']
    })
  ])
};

export default styles;
