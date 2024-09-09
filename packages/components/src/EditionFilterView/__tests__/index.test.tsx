import { describe, expect, test } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { EditionFilterView } from '../index';

describe('GIVEN an EditionFilterView', () => {
  const singleGroupView = [1, 2].map(index => ({
    eyebrow: `EYEBROW${index}`,
    group: 'SINGLE_GROUP',
    link: `LINK_URL${index}`,
    publicationDate: `PUBLICATION_DATE${index}`,
    formattedDescription: `FORMATTED_DESCRIPTION${index}`,
    title: `TITLE${index}`
  }));
  const multiGroupView = [1, 2].map(index => ({
    eyebrow: `EYEBROW${index}`,
    group: `MULTI_GROUP${index}`,
    link: `LINK_URL${index}`,
    publicationDate: `PUBLICATION_DATE${index}`,
    formattedDescription: `FORMATTED_DESCRIPTION${index}`,
    title: `TITLE${index}`
  }));
  test('THEN the children are rendered', () => {
    // arrange
    render(<EditionFilterView className="custom-class" view={multiGroupView} />);
    // assert
    expect(screen.getByText('EYEBROW1')).toBeInTheDocument();
    expect(screen.getByText('FORMATTED_DESCRIPTION1')).toBeInTheDocument();
    expect(screen.getByText('FORMATTED_DESCRIPTION1')).toBeInTheDocument();
    expect(screen.getByText('TITLE1')).toBeInTheDocument();
  });
  test('THEN the filter view is not rendered for single group', () => {
    // arrange
    render(<EditionFilterView view={singleGroupView} />);
    // assert
    expect(screen.queryByText('All Results Displayed')).not.toBeInTheDocument();
  });
  test('THEN the filter view is rendered for multi-group', () => {
    // arrange
    render(<EditionFilterView view={multiGroupView} />);
    // assert
    expect(screen.getByText('All Results Displayed')).toBeInTheDocument();
  });
});
