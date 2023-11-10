import React from 'react';
export interface AudioPlayerProps {
  src: string;
  skipDuration: 5 | 10 | 15;
  title?: string;
}
export declare const AudioPlayer: React.FC<AudioPlayerProps>;
