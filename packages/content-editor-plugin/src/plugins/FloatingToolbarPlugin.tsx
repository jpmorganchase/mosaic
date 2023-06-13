import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { Toolbar as SaltToolbar, Tooltray as SaltTooltray } from '@salt-ds/lab';
import { flip, inline } from '@floating-ui/react';
import { useFloatingUI, UseFloatingUIProps } from '@salt-ds/core';
import { useInteractions, useDismiss } from '@floating-ui/react';
import { Popper } from '../components/Popper/Popper';
import { TextFormatTooltray } from '../components/Toolbar/TextFormatTooltray';
import { InsertLinkButton } from '../components/Toolbar/InsertLink';

export function FloatingToolbarPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [floatingPosition, setFloatingPosition] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  const FloatingProps: UseFloatingUIProps = floatingPosition
    ? {
        middleware: [
          inline(floatingPosition),
          flip({
            fallbackPlacements: ['bottom-start', 'top-start']
          })
        ]
      }
    : {
        placement: 'bottom-start',
        strategy: 'absolute'
      };
  const { context, floating, reference, strategy } = useFloatingUI({
    placement: 'bottom-start',
    open,
    onOpenChange: setOpen,
    strategy: 'absolute',
    ...FloatingProps
  });
  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      ancestorScroll: true
    })
  ]);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    const anchorEl = nativeSelection?.anchorNode?.parentElement;
    if ($isRangeSelection(selection) && anchorEl && !nativeSelection?.isCollapsed) {
      reference(anchorEl);
      const getRange = nativeSelection.getRangeAt(0);
      const { x, y, height } = getRange.getBoundingClientRect();
      setFloatingPosition({ x, y: y + height });
      setOpen(true);
    } else {
      setFloatingPosition(null);
      setOpen(false);
    }
  }, [reference]);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => {
          editorState.read(() => {
            updateToolbar();
          });
        }),

        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            updateToolbar();
            return false;
          },
          COMMAND_PRIORITY_LOW
        )
      ),
    [editor, updateToolbar]
  );

  let style: Record<string, any> = { position: strategy };
  if (floatingPosition) {
    style = { ...style, top: floatingPosition.y, left: floatingPosition.x };
  }
  return (
    <Popper ref={floating} open={open} style={style} {...getFloatingProps({})}>
      <SaltToolbar aria-label="page editing toolbar" style={{ minWidth: '100px' }}>
        <TextFormatTooltray floating />
        <SaltTooltray aria-label="text format tooltray">
          <InsertLinkButton />
        </SaltTooltray>
      </SaltToolbar>
    </Popper>
  );
}
