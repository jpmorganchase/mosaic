import { useCallback, useEffect, useState, type JSX } from 'react';
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
  // Whether a browser drag (file drop, text drag-out, etc.) is in
  // progress. While true the popup is hidden so it doesn't sit on
  // top of the drag image or steal pointer events near the drop
  // target. Restored on dragend / drop.
  const [isDragging, setIsDragging] = useState<boolean>(false);

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

  /**
   * Mouse-drag suppression — taken from upstream's
   * FloatingTextFormatToolbarPlugin. While the user is mid-drag
   * (primary or middle button held) AND the cursor is NOT inside
   * the popup, drop pointer events on the popup so the drag
   * gesture isn't snagged by it. Restore on mouseup. Without this,
   * dragging a selection that briefly passes under the popup
   * causes the popup to capture the gesture and the selection
   * collapses.
   */
  useEffect(() => {
    const floatingEl = elements.floating;
    if (!floatingEl) return;

    const onMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 1 && e.buttons !== 3) return;
      if (floatingEl.style.pointerEvents === 'none') return;
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      if (!floatingEl.contains(elementUnderMouse)) {
        floatingEl.style.pointerEvents = 'none';
      }
    };
    const onMouseUp = () => {
      if (floatingEl.style.pointerEvents === 'none') {
        floatingEl.style.pointerEvents = 'auto';
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [elements.floating]);

  /**
   * Browser drag suppression — hide the popup entirely while any
   * drag is in progress on the page (file drop, image drag-in,
   * outbound text drag). Otherwise the popup floats over the drag
   * image and may re-render from `selectionchange` as the drag
   * source's selection changes, both of which are jarring.
   *
   * Listen on `window` (not `document`) so we catch drags that
   * originate outside the editor (e.g. files dropped from
   * Finder). `drop` is included alongside `dragend` because some
   * drag sources never fire `dragend` when the drop completes on
   * a different target.
   */
  useEffect(() => {
    const onDragStart = () => setIsDragging(true);
    const onDragEnd = () => setIsDragging(false);
    window.addEventListener('dragstart', onDragStart);
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('drop', onDragEnd);
    return () => {
      window.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('drop', onDragEnd);
    };
  }, []);

  return (
    <Popper
      ref={refs.setFloating}
      open={open && !isDragging}
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
