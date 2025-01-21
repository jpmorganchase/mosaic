import { style } from '@vanilla-extract/css';

export default {
  root: style([
    {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--salt-spacing-300)',
      padding: 'var(--salt-spacing-300)',
      position: 'relative'
    }
  ]),
  image: style([{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }]),
  link: style([
    {
      display: 'inline-flex',
      alignItems: 'center',
      padding: 'calc(var(--salt-spacing-100) - var(--salt-size-border))',
      fontSize: 'var(--salt-text-fontSize)',
      fontFamily: 'var(--salt-text-action-fontFamily)',
      lineHeight: 'var(--salt-text-lineHeight)',
      letterSpacing: 'var(--salt-text-action-letterSpacing)',
      textTransform: 'var(--salt-text-action-textTransform)',
      height: 'var(--salt-size-base)',
      fontWeight: 'var(--salt-text-action-fontWeight)',
      border: 'var(--salt-size-border) transparent solid',
      borderRadius: 'var(--salt-palette-corner-weak, 0)'
    },
    {
      color: 'var(--salt-actionable-accented-bold-foreground)',
      background: 'var(--salt-actionable-accented-bold-background)',
      borderColor: 'var(--salt-actionable-accented-bold-borderColor)',
      ':hover': {
        color: 'var(--salt-actionable-accented-bold-foreground-hover)',
        background: 'var(--salt-actionable-accented-bold-background-hover)',
        borderColor: 'var(--salt-actionable-accented-bold-borderColor-hover)'
      },
      ':active': {
        color: 'var(--salt-actionable-accented-bold-foreground-active)',
        background: 'var(--salt-actionable-accented-bold-background-active)',
        borderColor: 'var(--salt-actionable-accented-bold-borderColor-active)'
      },
      ':disabled': {
        color: 'var(--salt-actionable-accented-bold-foreground-disabled)',
        background: 'var(--salt-actionable-accented-bold-background-disabled)',
        borderColor: 'var(--salt-actionable-accented-bold-borderColor-disabled)'
      },
      ':focus-visible': {
        color: 'var(--salt-actionable-accented-bold-foreground-hover)',
        background: 'var(--salt-actionable-accented-bold-background-hover)',
        borderColor: 'var(--salt-actionable-accented-bold-borderColor-hover)',
        outline: 'var(--salt-focused-outline)'
      }
    }
  ]),
  title: style({ zIndex: 1 }),
  description: style({ zIndex: 1 }),
  links: style({ zIndex: 1 })
};
