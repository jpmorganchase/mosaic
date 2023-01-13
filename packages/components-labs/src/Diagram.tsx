import React, { useEffect } from 'react';
import { Mermaid, MermaidProps } from 'mdx-mermaid/lib/Mermaid';
import warning from 'warning';

let warnOnce: boolean;

export interface DiagramProps extends MermaidProps {
  /* Mermaid diagram refer to https://sjwall.github.io/mdx-mermaid/docs/intro/ */
  className?: string;
}

export function Diagram({ className, ...rest }: DiagramProps) {
  useEffect(() => {
    warning(
      warnOnce,
      'Diagram component is an alpha Lab component and not ready for Production use'
    );
    warnOnce = true;
  }, []);

  return (
    <div className={className}>
      <Mermaid {...rest} />
    </div>
  );
}
