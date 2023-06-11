import React, { useRef } from 'react';
import { Transition } from 'react-transition-group';

const transitionStyles = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exiting: { opacity: 0 },
  exited: { opacity: 0 }
};

type FadeProps = {
  children: React.ReactElement;
  duration?: {
    enter: number;
    exit: number;
  };
};

export const Fade: React.FC<FadeProps> = ({ children, duration }) => {
  const nodeRef = useRef(null);
  const defaultStyle = {
    transition: `opacity ${duration?.enter}ms ease-in-out`,
    opacity: 0
  };
  return (
    <Transition nodeRef={nodeRef} in={true} timeout={duration} unmountOnExit>
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
