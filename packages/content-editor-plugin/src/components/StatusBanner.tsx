import React from 'react';
import { Banner } from '@salt-ds/lab';

import { usePageState } from '../store';

const StatusBanner = () => {
  const { pageState, errorMessage } = usePageState();
  const isError = pageState === 'ERROR';
  return isError ? (
    <Banner announcement={errorMessage} status="error">
      {errorMessage}
    </Banner>
  ) : null;
};

export default StatusBanner;
