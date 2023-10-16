import { useEffect, useRef } from 'react';
import type { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

const ENDPOINT = process.env.NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL || '';

export default function useDataFeed(onError, onSuccess, onComplete) {
  const webSocketRef = useRef<WebSocket>();

  useEffect(function subscribe() {
    try {
      webSocketRef.current = new WebSocket(ENDPOINT);
      webSocketRef.current.onopen = () => console.log(`Workflows websocket open: ${ENDPOINT}`);
      webSocketRef.current.onclose = () => console.log('Workflows websocket closed');

      webSocketRef.current.onmessage = (msg: MessageEvent) => {
        const message: SourceWorkflowMessageEvent = JSON.parse(msg.data);

        if (message.status === 'ERROR') {
          onError(message);
        }
        if (message.status === 'DONE') {
          onComplete(message);
        }
        if (message.status === 'IN_PROGRESS' || message.status === 'SUCCESS') {
          onSuccess(message);
        }
      };
    } catch (ex) {
      onError(ex);
    }

    return () => {
      if (webSocketRef.current && webSocketRef.current?.OPEN) {
        webSocketRef.current.close();
      }
    };
  }, []);

  const sendMessage = message => {
    if (webSocketRef.current?.OPEN) {
      webSocketRef.current?.send(message);
    }
  };

  return {
    sendMessage
  };
}
