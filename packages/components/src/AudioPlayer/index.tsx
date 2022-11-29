import React, { useEffect, useState, useCallback } from 'react';
import { ButtonBar, OrderedButton } from '@jpmorganchase/uitk-lab';
import {
  VolumeUpIcon,
  VolumeOffIcon,
  DownloadIcon,
  PlaySolidIcon,
  PauseSolidIcon,
  Replay5Icon,
  Replay10Icon,
  Replay15Icon,
  Replay30Icon,
  Forward5Icon,
  Forward10Icon,
  Forward15Icon,
  Forward30Icon
} from '@jpmorganchase/uitk-icons';

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
  5: Forward5Icon,
  10: Forward10Icon,
  15: Forward15Icon,
  20: Forward30Icon
};

const replayIconByVariant = {
  5: Replay5Icon,
  10: Replay10Icon,
  15: Replay15Icon,
  30: Replay30Icon
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
  const ForwardIcon = forwardIconByVariant[skipDuration];
  const ReplayIcon = replayIconByVariant[skipDuration];

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

  const handleFastForward = () => {
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
      audioElem.currentTime = e.target.value;
      timeUpdate();
    }
  };

  return (
    <div className={styles.root}>
      <audio ref={audioRef} aria-label="audio" src={`${src}`} />
      <Caption3 className={styles.title}>{title}</Caption3>
      <div className={styles.sliderContainer}>
        <Caption6>{timeNowString}</Caption6>
        <input
          className={styles.slider}
          type="range"
          min="0"
          max={durationSeconds}
          value={timeNowSeconds}
          onChange={handleSliderInput}
        />
        <Caption6>{durationString}</Caption6>
      </div>

      <ButtonBar className={styles.buttonBar} stackAtBreakpoint={0}>
        <div>
          <a href={src} download target="_blank" rel="noreferrer">
            <OrderedButton variant="secondary" className={styles.button}>
              <DownloadIcon size="small" />
            </OrderedButton>
          </a>
        </div>
        <OrderedButton className={styles.button} variant="secondary" onClick={handleRewind}>
          <ReplayIcon size="large" />
        </OrderedButton>
        <OrderedButton
          className={styles.button}
          variant="secondary"
          onClick={handlePlay}
          disabled={playDisabled}
        >
          {isPlaying ? <PauseSolidIcon size="large" /> : <PlaySolidIcon size="large" />}
        </OrderedButton>
        <OrderedButton className={styles.button} variant="secondary" onClick={handleFastForward}>
          <ForwardIcon size="large" />
        </OrderedButton>
        <OrderedButton variant="secondary" onClick={handleMute} className={styles.button}>
          {mute ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </OrderedButton>
      </ButtonBar>
    </div>
  );
};
