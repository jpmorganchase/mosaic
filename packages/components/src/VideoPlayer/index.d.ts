import React from 'react';
export interface VideoPlayerProps {
  src: string;
  skipDuration: number;
}
export declare const VideoPlayer: React.FC<React.PropsWithChildren<VideoPlayerProps>>;
