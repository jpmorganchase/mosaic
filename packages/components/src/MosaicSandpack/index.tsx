import React, { FC } from 'react';
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview
} from '@codesandbox/sandpack-react';
// import { Sandpack } from '@codesandbox/sandpack-react';
import classnames from 'clsx';
// import styles from './styles.css';

export interface MosaicSandpackProps {
  /** Additional class name for root class override. */
  className?: string;
  // children?: ReactNode;
  // sticky?: boolean;
}

export const MosaicSandpack: FC<MosaicSandpackProps> = ({ className }) => {
  const files = {};

  return (
    //   <div className={classnames(className)}>
    //   <Sandpack
    //   files={files}
    //   theme="light"
    //   template="nextjs"
    // />
    // </div>
    <SandpackProvider
      files={files}
      theme="light"
      template="nextjs"
      className={classnames(className)}
    >
      <SandpackLayout>
        <SandpackFileExplorer />
        <SandpackCodeEditor closableTabs showTabs />
        <SandpackPreview />
      </SandpackLayout>
    </SandpackProvider>
  );
};
