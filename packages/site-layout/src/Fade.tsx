import React, { FC, useRef, useState } from 'react';
import { Transition } from 'react-transition-group';

const transitionStyles = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exiting: { opacity: 0 },
  exited: { opacity: 0 }
};

type FadeProps = {
  children?: React.ReactNode;
  duration?: {
    enter: number;
    exit: number;
  };
  in: boolean;
};

export const Fade: FC<FadeProps> = ({ children, duration, in: inProp }) => {
  const nodeRef = useRef(null);
  const [hasExited, setHasExited] = useState<boolean>(false);
  const defaultStyle = {
    transition: `opacity ${duration.enter}ms ease-in-out`,
    opacity: 0
  };
  const handleExit = () => {
    setHasExited(true);
  };
  if (hasExited) {
    return children;
  }
  return (
    <Transition nodeRef={nodeRef} in={inProp} timeout={duration} onExit={handleExit} unmountOnExit>
      {state => (
        <div
          ref={nodeRef}
          style={{
            ...defaultStyle,
            ...transitionStyles[state]
          }}
        >
          {children}
        </div>
      )}
    </Transition>
  );
};
