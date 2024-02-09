import { useEffect, useRef } from 'react';
import type { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

const ENDPOINT = process.env.NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL || '';

type SourceWorkflowMessageEventHandler = (message: SourceWorkflowMessageEvent) => void;
type SourceWorkflowMessageEventExceptionHandler = (errorMessage: any) => void;

export default function useDataFeed(
  connect: boolean,
  onError: SourceWorkflowMessageEventExceptionHandler,
  onSuccess: SourceWorkflowMessageEventHandler,
  onComplete: SourceWorkflowMessageEventHandler
) {
  const webSocketRef = useRef<WebSocket>();
  const channelRef = useRef<string | null>();

  useEffect(
    function subscribe() {
      try {
        if (connect) {
          webSocketRef.current = new WebSocket(ENDPOINT);
          webSocketRef.current.onopen = () => console.log(`Workflows websocket open: ${ENDPOINT}`);
          webSocketRef.current.onclose = () => console.log('Workflows websocket closed');

          webSocketRef.current.onmessage = (msg: MessageEvent) => {
            const message: SourceWorkflowMessageEvent = JSON.parse(msg.data);

            if (message.channel !== channelRef.current) {
              // message is not for us;
              return;
            }

            if (message.status === 'ERROR') {
              onError(message);
            }
            if (message.status === 'COMPLETE') {
              onComplete(message);
            }
            if (message.status === 'IN_PROGRESS' || message.status === 'SUCCESS') {
              onSuccess(message);
            }
          };
        }
      } catch (ex) {
        onError(ex);
      }

      return () => {
        if (webSocketRef.current && webSocketRef.current?.OPEN) {
          channelRef.current = null;
          webSocketRef.current.close();
        }
      };
    },
    [connect]
  );

  const sendWorkflowProgressMessage = (message, channel) => {
    if (webSocketRef.current?.OPEN) {
      channelRef.current = channel;
      webSocketRef.current?.send(message);
    }
  };

  return {
    sendWorkflowProgressMessage
  };
}
