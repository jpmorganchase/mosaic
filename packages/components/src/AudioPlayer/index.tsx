import React, { useEffect, useState, useCallback, useRef } from 'react';

import { Button, Slider } from '@salt-ds/core';
import { Icon } from '../Icon';

import { Caption3, Caption6 } from '../Typography';
import styles from './styles.css';

export interface AudioPlayerProps {
  src: string;
  skipDuration: 5 | 10 | 15;
  title?: string;
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
  20: 'forward20'
};

const replayIconByVariant = {
  5: 'replay5',
  10: 'replay10',
  15: 'replay15',
  30: 'replay30'
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, skipDuration = 15 }) => {
  const [audioElem, setAudioElem] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mute, setMute] = useState(false);
  const [playDisabled, setPlayDisabled] = useState(true);
  const [durationString, setDurationString] = useState('00:00:00');
  const [timeNowString, setTimeNowString] = useState('00:00:00');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [timeNowSeconds, setTimeNowSeconds] = useState(0);

  const audioRef = useCallback(audioNode => {
    setAudioElem(audioNode);
  }, []);

  const timeUpdate = useCallback(() => {
    if (audioElem) {
      const currentTimeFormatted = timeFormat(audioElem.currentTime);
      setTimeNowString(currentTimeFormatted);
      setTimeNowSeconds(audioElem.currentTime);
    }
  }, [audioElem]);

  const onLoad = useCallback(() => {
    if (audioElem) {
      const durationFormatted = timeFormat(audioElem.duration);
      setDurationString(durationFormatted);
      setDurationSeconds(audioElem.duration);
      setPlayDisabled(false);
    }
  }, [audioElem]);

  useEffect(() => {
    if (audioElem) {
      audioElem.addEventListener('timeupdate', timeUpdate);
      audioElem.addEventListener('loadedmetadata', onLoad);
    }
    return () => {
      if (audioElem) {
        audioElem.removeEventListener('timeupdate', timeUpdate);
        audioElem.removeEventListener('loadedmetadata', onLoad);
      }
    };
  }, [audioElem, onLoad, timeUpdate]);

  const handleFastforward = () => {
    if (audioElem) {
      audioElem.currentTime += skipDuration;
    }
  };

  const handleRewind = () => {
    if (audioElem) {
      audioElem.currentTime -= skipDuration;
    }
  };

  const handlePlay = () => {
    if (isPlaying) {
      audioElem?.pause();
      setIsPlaying(false);
    } else {
      audioElem?.play();
      setIsPlaying(true);
    }
  };

  const handleMute = () => {
    if (audioElem?.volume) {
      audioElem.volume = 0;
      setMute(true);
    } else if (audioElem) {
      audioElem.volume = 1;
      setMute(false);
    }
  };

  const handleSliderInput = e => {
    if (audioElem) {
      audioElem.currentTime = e;
      timeUpdate();
    }
  };

  const downloadLink = useRef<HTMLAnchorElement>(null);

  const handleDownload = () => {
    downloadLink.current?.click();
  };

  return (
    <div className={styles.root}>
      <audio ref={audioRef} aria-label="audio" src={`${src}`} />
      <Caption3 className={styles.title}>{title}</Caption3>
      <div className={styles.sliderContainer}>
        <Caption6>{timeNowString}</Caption6>
        <Slider
          className={styles.slider}
          min={0}
          max={durationSeconds}
          value={timeNowSeconds}
          onChange={handleSliderInput}
        />
        <Caption6>{durationString}</Caption6>
      </div>

      <div className={styles.buttonBar}>
        <div>
          <Button sentiment="neutral" appearance="transparent" onClick={handleDownload}>
            <Icon name="download" />
          </Button>
          <a
            ref={downloadLink}
            hidden
            aria-hidden
            href={src}
            download
            target="_blank"
            rel="noreferrer"
          />
        </div>
        <Button sentiment="neutral" appearance="transparent" onClick={handleRewind}>
          <Icon name={replayIconByVariant[skipDuration]} />
        </Button>
        <Button
          sentiment="neutral"
          appearance="transparent"
          onClick={handlePlay}
          disabled={playDisabled}
        >
          {isPlaying ? <Icon name="pauseSolid" /> : <Icon name="playSolid" />}
        </Button>
        <Button sentiment="neutral" appearance="transparent" onClick={handleFastforward}>
          <Icon name={forwardIconByVariant[skipDuration]} />
        </Button>
        <Button sentiment="neutral" appearance="transparent" onClick={handleMute}>
          {mute ? <Icon name="volumeOff" /> : <Icon name="volumeUp" />}
        </Button>
      </div>
    </div>
  );
};
