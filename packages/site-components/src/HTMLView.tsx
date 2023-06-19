'use client';

import React, { useEffect } from 'react';

const embeddedWebViewInitialized = false;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'embedded-webview': { html: string } & Partial<HTMLElement>;
    }
  }
}

function initEmbeddedWebView() {
  if (typeof window === 'undefined') {
    return;
  }

  if (embeddedWebViewInitialized) {
    return;
  }

  class EmbeddedWebview extends HTMLElement {
    connectedCallback() {
      if (typeof window !== 'undefined') {
        const shadow = this.attachShadow({ mode: 'closed' });
        shadow.innerHTML = this.getAttribute('html') || '';
      }
    }
  }

  if (typeof window !== 'undefined' && !window.customElements.get('embedded-webview')) {
    window.customElements.define('embedded-webview', EmbeddedWebview);
  }
}

export function HTMLView({ children }) {
  useEffect(() => {
    initEmbeddedWebView();
  }, []);

  if (typeof window === 'undefined') {
    // eslint-disable-next-line react/no-danger
    return <div dangerouslySetInnerHTML={{ __html: children }} />;
  }

  return <embedded-webview html={children} />;
}
