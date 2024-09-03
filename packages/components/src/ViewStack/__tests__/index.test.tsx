import { describe, expect, test } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { ViewStack, View } from '../index';

describe('GIVEN an `ViewStack` component', () => {
  test('THEN should respect any new currentViewId', () => {
    const { getAllByText, rerender } = render(
      <ViewStack currentViewId="view2">
        <View id="view1">View 1</View>
        <View id="view2">View 2</View>
        <View id="view3">View 3</View>
      </ViewStack>
    );

    rerender(
      <ViewStack currentViewId="view3">
        <View id="view1">View 1</View>
        <View id="view2">View 2</View>
        <View id="view3">View 3</View>
      </ViewStack>
    );

    expect(getAllByText('View 3')).toBeDefined();
  });
  test('THEN should respect the initial currentViewId', () => {
    const { getAllByText } = render(
      <ViewStack currentViewId="view2">
        <View id="view1">View 1</View>
        <View id="view2">View 2</View>
        <View id="view3">View 3</View>
      </ViewStack>
    );

    expect(getAllByText('View 2')).toBeDefined();
  });
  test('THEN should fallback to the defaultView when currentViewId changes to an invalid id', () => {
    const { getAllByText, rerender } = render(
      <ViewStack currentViewId="view2">
        <View defaultView id="view1">
          View 1
        </View>
        <View id="view2">View 2</View>
        <View id="view3">View 3</View>
      </ViewStack>
    );

    rerender(
      <ViewStack currentViewId="view-invalid">
        <View defaultView id="view1">
          View 1
        </View>
        <View id="view2">View 2</View>
        <View id="view3">View 3</View>
      </ViewStack>
    );

    expect(getAllByText('View 1')).toBeDefined();
  });
  test('THEN should fallback to the defaultView when no currentViewId is specified', () => {
    const { getAllByText } = render(
      <ViewStack>
        <View id="view1">View 1</View>
        <View defaultView id="view2">
          View 2
        </View>
        <View id="view3">View 3</View>
      </ViewStack>
    );

    expect(getAllByText('View 2')).toBeDefined();
  });
  test('THEN should fallback to the defaultView for invalid view IDs', () => {
    const { getAllByText } = render(
      <ViewStack currentViewId="view-invalid">
        <View id="view1">View 1</View>
        <View id="view2">View 2</View>
        <View defaultView id="view3">
          View 3
        </View>
      </ViewStack>
    );

    expect(getAllByText('View 3')).toBeDefined();
  });
});
