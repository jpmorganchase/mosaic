import React, { FC, ReactNode, useEffect, useState } from 'react';
import classnames from 'classnames';
import { P2 } from '@jpmorganchase/mosaic-components';

import styles from './PersistStatus.css';

const steps = ['Making a copy...', 'Applying changes...', 'Creating a Pull Request...'];
const lastStep = steps.length - 1;

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
    <span role="img" aria-label="emoji with party hat">
      {isComplete ? '🥳' : null}
    </span>
    <span role="img" aria-label="person grimacing emoji ">
      {isCurrent ? '😃' : null}
    </span>
    <span role="img" aria-label="sleepy emoji">
      {!isCurrent && !isComplete ? '💤' : null}
    </span>
    <span className={styles.stepText}>{children}</span>
    <span role="img" aria-label="hourglass">
      {isCurrent ? '⌛' : null}
    </span>
  </div>
);

interface StatusProps {
  isRaising: boolean;
  error: string | null;
}

export const PersistStatus = ({ isRaising, error }: StatusProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      if (currentStep === steps.length - 1) {
        clearInterval(stepInterval);
      } else {
        setCurrentStep(prevState => prevState + 1);
      }
    }, 2000);
    return function cleanUpStepInterval() {
      clearInterval(stepInterval);
    };
  }, [currentStep]);

  if (error) {
    return <P2>😢 Sorry something has went wrong. Please try again later.</P2>;
  }

  return (
    <>
      {steps.map((step, index) => (
        <Step
          key={`step -${index}`}
          isComplete={
            currentStep === lastStep && index === lastStep ? !isRaising : currentStep > index
          }
          isCurrent={currentStep === index}
        >
          {step}
        </Step>
      ))}
    </>
  );
};
