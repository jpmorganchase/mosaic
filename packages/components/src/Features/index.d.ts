import React, { ReactElement } from 'react';
import { FeatureProps } from '../Feature';
/**
 * The props type for [[`Features`]].
 */
export interface FeaturesProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the Features. This should be multiple [[`Feature`]] components. */
  children: ReactElement<FeatureProps>[];
}
/**
Renders Features, a group for Feature components. Image placement starts on the right and is alternated for each subsequent Feature.
*/
export declare const Features: React.FC<FeaturesProps>;
