import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spinner, Slider, Button } from '@salt-ds/core';
import classnames from 'clsx';
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
  return date.toISOString().substring(11, 19);
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
      setDurationSeconds(videoElem.duration);
      setMetaDataLoaded(true);
    }
  }, [videoElem]);

  const timeUpdate = useCallback(() => {
    if (videoElem) {
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

  const handleSliderInput = (_: Event, value: number) => {
    if (videoElem) {
      videoElem.currentTime = value;
      timeUpdate();
    }
  };

  const enterFullScreen = () => {
    videoElem?.requestFullscreen();
  };

  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = () => {
    linkRef.current?.click();
  };

  return (
    <div className={styles.root}>
      <video ref={videoRef} aria-label="video" src={src} className={styles.video} />
      <div className={styles.overlay} style={{ display: isPlaying ? 'none' : '' }}>
        {metaDataLoaded ? null : <Spinner size="large" />}
      </div>
      <div className={styles.controlsBar}>
        <div className={styles.buttonBar}>
          <Button sentiment="neutral" appearance="transparent" onClick={handleReplay}>
            <Icon name={replayIconByVariant[skipDuration]} />
          </Button>
          <Button
            sentiment="neutral"
            appearance="transparent"
            onClick={handlePlay}
            disabled={!metaDataLoaded}
          >
            <Icon name={isPlaying ? 'pauseSolid' : 'playSolid'} />
          </Button>
          <Button sentiment="neutral" appearance="transparent" onClick={handleFastForward}>
            <Icon name={forwardIconByVariant[skipDuration]} />
          </Button>
        </div>

        <div className={styles.sliderContainer}>
          <Caption6>{timeFormat(timeNowSeconds)}</Caption6>
          <Slider
            className={styles.slider}
            min={0}
            max={durationSeconds}
            value={timeNowSeconds}
            onChange={handleSliderInput}
            format={value => timeFormat(value)}
          />
          <Caption6>{timeFormat(durationSeconds)}</Caption6>
        </div>
        <div className={classnames(styles.buttonBar, styles.leftAlign)}>
          <div>
            <Button sentiment="neutral" appearance="transparent" onClick={handleDownload}>
              <Icon name="download" />
            </Button>
            <a ref={linkRef} href={src} target="_blank" download rel="noreferrer" />
          </div>
          <Button sentiment="neutral" appearance="transparent" onClick={mute}>
            <Icon name={volumeOn ? 'volumeUp' : 'volumeDown'} />
          </Button>
          <Button sentiment="neutral" appearance="transparent" onClick={enterFullScreen}>
            <Icon name="maximize" />
          </Button>
        </div>
      </div>
    </div>
  );
};
