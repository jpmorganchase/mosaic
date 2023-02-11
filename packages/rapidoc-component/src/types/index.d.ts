import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['rapi-doc']: React.DetailedHTMLProps<any, HTMLElement>;
    }
  }
}
