import { style } from '@vanilla-extract/css';
import { heading, link, paragraph, headingSprinkles, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

const styles = {
  summary: style([
    heading({ variant: 'heading6' }),
    link({ variant: 'selectable' }),
    {
      alignItems: 'center',
      display: 'flex'
    }
  ]),
  content: style([paragraph({ variant: 'paragraph2' })])
};

export default styles;
