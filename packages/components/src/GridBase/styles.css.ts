import { style } from '@vanilla-extract/css';

const styles = {
  root: style({
    display: 'flex',
    flexWrap: 'wrap'
  }),
  rowDirection: style({
    flexDirection: 'row'
  }),
  columnDirection: style({
    flexDirection: 'column'
  }),
  spaceBetween: style({
    justifyContent: 'space-between'
  })
};

export default styles;
