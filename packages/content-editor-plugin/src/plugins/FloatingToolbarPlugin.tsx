import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { flip, inline, useInteractions, useDismiss } from '@floating-ui/react';
import { useFloatingUI } from '@salt-ds/core';
import { Popper } from '../components/Popper/Popper';
import { TextFormatTooltray } from '../components/Toolbar/TextFormatTooltray';
import { InsertLinkButton } from '../components/Toolbar/InsertLink';
import { BaseToolbar as Toolbar } from '../components/BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from '../components/BaseTooltray/BaseTooltray';
import styles from './FloatingToolbarPlugin.css';

export function FloatingToolbarPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState<boolean>(false);

  const { context, refs, strategy, x, y, elements } = useFloatingUI({
    placement: 'bottom-start',
    open,
    onOpenChange: setOpen,
    strategy: 'absolute',
    middleware: [
      inline(),
      flip({
        fallbackPlacements: ['bottom-start', 'top-start']
      })
    ]
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
      const range = nativeSelection.getRangeAt(0);
      refs.setReference({
        getBoundingClientRect: () => range.getBoundingClientRect(),
        getClientRects: () => range.getClientRects()
      });
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [refs]);

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

  return (
    <Popper
      ref={refs.setFloating}
      open={open}
      {...getFloatingProps({})}
      top={y ?? 0}
      left={x ?? 0}
      position={strategy}
      width={elements.floating?.offsetWidth}
      height={elements.floating?.offsetHeight}
    >
      <Toolbar aria-label="page editing toolbar" className={styles.toolbar}>
        <TextFormatTooltray floating />
        <Tooltray aria-label="text format tooltray">
          <InsertLinkButton />
        </Tooltray>
      </Toolbar>
    </Popper>
  );
}
