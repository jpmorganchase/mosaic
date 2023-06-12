import React from 'react';
import { Banner, BannerContent } from '@salt-ds/core';

import { usePageState } from '../store';

const StatusBanner = () => {
  const { pageState, errorMessage } = usePageState();
  const isError = pageState === 'ERROR';
  return isError ? (
    <Banner status="error">
      <BannerContent role="status">{errorMessage}</BannerContent>
    </Banner>
  ) : null;
};

export default StatusBanner;
