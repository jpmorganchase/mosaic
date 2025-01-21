import React, { ReactElement } from 'react';
import classnames from 'clsx';

import styles from './styles.css';
import { Display2, Text } from '@salt-ds/core';
import { LinkBase } from '../../LinkBase';
import { useImageComponent } from '../../ImageProvider';

export interface BrandHeroProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the Hero. */
  description?: string | ReactElement;
  /** Image to be displayed. */
  image?: string;
  /** The title of the Hero. */
  title: string | ReactElement;
  links?: {
    label: string;
    url: string;
  }[];
}

export const BrandHero: React.FC<BrandHeroProps> = ({
  className,
  description,
  image,
  title,
  links,
  ...rest
}) => {
  const ImageComponent = useImageComponent();

  return (
    <div className={classnames(styles.root, className)} {...rest}>
      {image && <ImageComponent alt="" className={styles.image} fill src={image} priority />}
      <Display2 className={styles.title}>{title}</Display2>
      <Text className={styles.description}>{description}</Text>
      {Array.isArray(links) && links.length > 0 && (
        <div className={styles.links}>
          {links.map(link => (
            <LinkBase className={styles.link} key={link.label} href={link.url}>
              {link.label}
            </LinkBase>
          ))}
        </div>
      )}
    </div>
  );
};
