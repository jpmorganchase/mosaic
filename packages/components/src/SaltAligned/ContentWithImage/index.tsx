import React, { ReactElement, ReactNode } from 'react';
import classnames from 'clsx';
import styles from './styles.css';
import { H2 } from '@salt-ds/core';
import { Link } from '../../Link';
import { useImageComponent } from '../../ImageProvider';

export interface ContentWithImageProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The title of the Hero. */
  title: string | ReactElement;
  description: string | ReactElement;
  link?: { label: string; url: string };
  children?: ReactNode;
  image?: string;
}

export const ContentWithImage: React.FC<ContentWithImageProps> = ({
  children,
  className,
  title,
  description,
  image,
  link,
  ...rest
}) => {
  const ImageComponent = useImageComponent();

  return (
    <div className={classnames(styles.root, className)} {...rest}>
      <ImageComponent className={styles.image} priority fill src={image} />
      <div className={styles.content}>
        <H2 styleAs="display4">{title}</H2>
        {children}
        {link && (
          <Link className={styles.action} href={link.url}>
            {link.label}
          </Link>
        )}
      </div>
    </div>
  );
};
