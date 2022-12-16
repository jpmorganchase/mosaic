import React from 'react';
import * as UITKIcons from '@salt-ds/icons';
import type { IconProps as UITKIconProps } from '@salt-ds/icons';
import { StackOverflowIcon } from './StackOverflowIcon';
import type { uitkIconNames } from '../../types/uitkIconNames';

const {
  DEFAULT_ICON_SIZE: DEDEFAULT_ICON_SIZE,
  Icon: _Icon,
  makePrefixer: _makePrefixer,
  ...allIcons
} = UITKIcons;

export type IconMap = Record<string, React.FC<UITKIconProps>>;

/** Add any additional icons here */
const additionalIcons: IconMap = {
  stackOverflow: StackOverflowIcon
};

export type IconNames = keyof typeof additionalIcons | 'none' | uitkIconNames;

const allIconKeys = Object.keys(allIcons);
export const icons = allIconKeys.reduce<IconMap>(
  (result, iconComponentName) => {
    const iconName = iconComponentName.replace(/Icon$/, '');
    const shortName = iconName.charAt(0).toLowerCase() + iconName.slice(1);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return { ...result, [shortName]: allIcons[iconComponentName] };
  },
  { ...additionalIcons }
);
