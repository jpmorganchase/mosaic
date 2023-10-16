import React, { FC, ReactNode } from 'react';
import classnames from 'clsx';
import { P2, P6 } from '@jpmorganchase/mosaic-components';

import styles from './PersistStatus.css';
import { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

interface StepProps {
  children?: ReactNode;
  isComplete: boolean;
  isCurrent: boolean;
}

const Step: FC<StepProps> = ({ children, isComplete, isCurrent }) => (
  <div
    className={classnames(styles.step, {
      [styles.stepComplete]: isComplete,
      [styles.stepActive]: isCurrent
    })}
  >
    <span role="img" aria-label={isComplete ? 'emoji with party hat' : 'hourglass'}>
      {isComplete ? '🥳' : '⌛'}
    </span>

    <span className={styles.stepText}>{children}</span>
  </div>
);

interface StatusProps {
  error: string | null;
  progress: SourceWorkflowMessageEvent[];
}

export const PersistStatus = ({ error, progress }: StatusProps) => {
  if (error) {
    return (
      <>
        <P2>😢 Sorry something has went wrong. Please try again later.</P2>
        <P6>Error - {error}</P6>
      </>
    );
  }

  return (
    <>
      {progress.map((message, index) => (
        <Step
          key={`step -${index}`}
          isComplete={index < progress.length - 1}
          isCurrent={progress.length - 1 === index}
        >
          {message.message}
        </Step>
      ))}
    </>
  );
};
