'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ButtonBar, OrderedButton, Spinner, Slider } from '@salt-ds/lab';
import { Icon } from '../Icon';
import { Caption6 } from '../Typography';
import styles from './styles.css';

export interface VideoPlayerProps {
  src: string;
  skipDuration: number;
}

function timeFormat(durationS): string {
  const date = new Date(0);
  date.setSeconds(durationS);
  const timeString = date.toISOString().substring(11, 19);
  return timeString;
}

const forwardIconByVariant = {
  5: 'forward5',
  10: 'forward10',
  15: 'forward15',
  20: 'forward30'
};

const replayIconByVariant = {
  5: 'replay5',
  10: 'replay10',
  15: 'replay15',
  20: 'replay30'
};

export const VideoPlayer: React.FC<React.PropsWithChildren<VideoPlayerProps>> = ({
  src,
  skipDuration
}) => {
  const [videoElem, setVideoElem] = useState<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationString, setDurationString] = useState('00:00:00');
  const [timeNowString, setTimeNowString] = useState('00:00:00');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [timeNowSeconds, setTimeNowSeconds] = useState(0);
  const [volumeOn, setVolumeOn] = useState(true);
  const [metaDataLoaded, setMetaDataLoaded] = useState(false);

  const videoRef = useCallback((videoNode: HTMLVideoElement | null) => {
    if (videoNode) {
      setVideoElem(videoNode);
    }
  }, []);

  const onLoad = useCallback(() => {
    if (videoElem) {
      const durationFormatted = timeFormat(videoElem.duration);
      setDurationString(durationFormatted);
      setDurationSeconds(videoElem.duration);
      setMetaDataLoaded(true);
    }
  }, [videoElem]);

  const timeUpdate = useCallback(() => {
    if (videoElem) {
      const currentTimeFormatted = timeFormat(videoElem.currentTime);
      setTimeNowString(currentTimeFormatted);
      setTimeNowSeconds(videoElem.currentTime);
    }
  }, [videoElem]);

  useEffect(() => {
    if (videoElem) {
      videoElem.addEventListener('timeupdate', timeUpdate);
      videoElem.addEventListener('loadedmetadata', onLoad);
    }
    return () => {
      if (videoElem) {
        videoElem.removeEventListener('timeupdate', timeUpdate);
        videoElem.removeEventListener('loadedmetadata', onLoad);
      }
    };
  }, [onLoad, timeUpdate, videoElem]);

  const handleFastForward = () => {
    if (videoElem) {
      videoElem.currentTime += skipDuration;
    }
  };

  const handleReplay = () => {
    if (videoElem) {
      videoElem.currentTime -= skipDuration;
    }
  };

  const handlePlay = () => {
    if (videoElem) {
      if (isPlaying) {
        videoElem.pause();
        setIsPlaying(false);
      } else {
        videoElem.play();
        setIsPlaying(true);
      }
    }
  };

  const mute = () => {
    if (videoElem?.volume) {
      videoElem.volume = 0;
      setVolumeOn(false);
    } else if (videoElem) {
      videoElem.volume = 1;
      setVolumeOn(true);
    }
  };

  const handleSliderInput = e => {
    if (videoElem) {
      videoElem.currentTime = e;
      timeUpdate();
    }
  };

  const enterFullScreen = () => {
    videoElem?.requestFullscreen();
  };

  return (
    <div className={styles.root}>
      <video ref={videoRef} aria-label="video" src={src} className={styles.video} />
      <div className={styles.overlay} style={{ display: isPlaying ? 'none' : '' }}>
        {metaDataLoaded ? null : <Spinner size="large" />}
      </div>
      <div className={styles.controlsBar}>
        <ButtonBar stackAtBreakpoint={0} disableAutoAlignment>
          <OrderedButton className={styles.button} variant="secondary" onClick={handleReplay}>
            <Icon name={replayIconByVariant[skipDuration]} />
          </OrderedButton>
          <OrderedButton
            className={styles.button}
            variant="secondary"
            onClick={handlePlay}
            disabled={!metaDataLoaded}
          >
            <Icon name={isPlaying ? 'pauseSolid' : 'playSolid'} />
          </OrderedButton>
          <OrderedButton className={styles.button} variant="secondary" onClick={handleFastForward}>
            <Icon name={forwardIconByVariant[skipDuration]} />
          </OrderedButton>
        </ButtonBar>

        <div className={styles.sliderContainer}>
          <Caption6>{timeNowString}</Caption6>
          <Slider
            className={styles.slider}
            min={0}
            max={durationSeconds}
            value={timeNowSeconds}
            onChange={handleSliderInput}
          />
          <Caption6> {durationString}</Caption6>
        </div>
        <ButtonBar stackAtBreakpoint={0} alignLeft>
          <a href={src} target="_blank" download rel="noreferrer">
            <OrderedButton className={styles.button} variant="secondary">
              <Icon name="download" />
            </OrderedButton>
          </a>
          <OrderedButton className={styles.button} variant="secondary" onClick={mute}>
            <Icon name={volumeOn ? 'volumeUp' : 'volumeDown'} />
          </OrderedButton>
          <OrderedButton className={styles.button} variant="secondary" onClick={enterFullScreen}>
            <Icon name="maximize" />
          </OrderedButton>
        </ButtonBar>
      </div>
    </div>
  );
};
