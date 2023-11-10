import React, { ReactElement } from 'react';
import { CardProps } from './Card';
export interface CardsProps {
  className?: string;
  children: ReactElement<CardProps>[];
}
export declare const Cards: React.FC<CardsProps>;
