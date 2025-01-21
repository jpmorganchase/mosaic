import { style } from '@vanilla-extract/css';

export default {
  root: style([
    {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--salt-spacing-100)'
    }
  ]),
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
      width: 'max-content'
    },
    {
      color: 'var(--salt-actionable-bold-foreground)',
      background: 'var(--salt-actionable-bold-background)',
      borderColor: 'var(--salt-actionable-bold-borderColor)',
      ':hover': {
        color: 'var(--salt-actionable-bold-foreground-hover)',
        background: 'var(--salt-actionable-bold-background-hover)',
        borderColor: 'var(--salt-actionable-bold-borderColor-hover)'
      },
      ':active': {
        color: 'var(--salt-actionable-bold-foreground-active)',
        background: 'var(--salt-actionable-bold-background-active)',
        borderColor: 'var(--salt-actionable-bold-borderColor-active)'
      },
      ':disabled': {
        color: 'var(--salt-actionable-bold-foreground-disabled)',
        background: 'var(--salt-actionable-bold-background-disabled)',
        borderColor: 'var(--salt-actionable-bold-borderColor-disabled)'
      },
      ':focus-visible': {
        color: 'var(--salt-actionable-bold-foreground-hover)',
        background: 'var(--salt-actionable-bold-background-hover)',
        borderColor: 'var(--salt-actionable-bold-borderColor-hover)',
        outline: 'var(--salt-focused-outline)'
      }
    }
  ])
};
