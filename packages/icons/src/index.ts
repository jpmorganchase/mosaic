'use client';
import React from 'react';
import * as SaltIcons from '@salt-ds/icons';
import type { IconProps as SaltIconProps } from '@salt-ds/icons';
import type { saltIconNames } from '../types/saltIconNames';

const {
  DEFAULT_ICON_SIZE: DEDEFAULT_ICON_SIZE,
  Icon: _Icon,
  makePrefixer: _makePrefixer,
  ...allIcons
} = SaltIcons;

export type IconMap = Record<string, React.FC<SaltIconProps>>;

/** Add any additional icons here */
const additionalIcons: IconMap = {};

export type IconNames = keyof typeof additionalIcons | 'none' | saltIconNames;

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
