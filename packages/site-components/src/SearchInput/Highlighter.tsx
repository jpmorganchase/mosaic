import type { ReactElement } from 'react';
import styles from './styles.css';

export interface HighlighterProps {
  matchPattern?: RegExp | string;
  text?: string;
}

const regExp = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(string: string): string {
  return string.replace(regExp, '\\$&');
}

export const Highlighter = (props: HighlighterProps): ReactElement<HighlighterProps> => {
  const { matchPattern, text = '' } = props;

  const matchRegex =
    typeof matchPattern === 'string'
      ? new RegExp(`(${escapeRegExp(matchPattern)})`, 'gi')
      : matchPattern;

  if (matchRegex === undefined || matchPattern === '') {
    return <>{text}</>;
  }
  return (
    <span>
      {text.split(matchRegex).map((part, index) =>
        part.match(matchRegex) ? (
          <strong className={styles.highlight} key={`${index}-${part}`}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
};
