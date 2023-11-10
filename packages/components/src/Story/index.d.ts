import React from 'react';
export interface StoryProps {
  className?: string;
  children: React.ReactNode;
  link?: string;
  linkText?: string;
  subtitle?: string;
  title?: string;
  image?: string;
  variant?: 'primary' | 'secondary';
}
export declare const Story: React.FC<StoryProps>;
