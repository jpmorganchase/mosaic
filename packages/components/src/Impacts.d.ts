import React, { ReactElement } from 'react';
import { ImpactProps } from './Impact';
export interface ImpactsProps {
  className?: string;
  children: ReactElement<ImpactProps>[];
}
export declare const Impacts: React.FC<ImpactsProps>;
