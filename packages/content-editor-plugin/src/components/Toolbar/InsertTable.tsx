import React, { ReactElement, FC, ReactNode, MouseEventHandler, useRef, useState } from 'react';
import { Icon } from '@jpmorganchase/mosaic-components';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_TABLE_COMMAND } from '@lexical/table';

import { useFloatingUI } from '@salt-ds/core';
import { useDismiss, useInteractions } from '@floating-ui/react';
import { Popper } from '../Popper/Popper';
import { TextFormatToolbarButton } from './TextFormatToolbarButton';
import styles from './InsertTable.css';

interface IndexableEntity {
  children?: ReactNode;
  index: number;
}

const Cell: FC<IndexableEntity> = ({ index, ...rest }) => (
  <td className={styles.cell} data-column={index} {...rest} />
);

const Row: FC<IndexableEntity> = ({ children, index }) => (
  <tr className={index === 1 ? styles.headerRow : styles.row} data-row={index}>
    {children}
  </tr>
);

interface TableBodyProps {
  rowCount: number;
  columnCount: number;
}

const TableBody: FC<TableBodyProps> = ({ rowCount, columnCount }) => {
  const cells: ReactElement[] = [];
  const rows: ReactElement[] = [];
  for (let i = 1; i <= columnCount; i++) {
    cells.push(<Cell key={i} index={i} />);
  }

  for (let i = 1; i <= rowCount; i++) {
    rows.push(
      <Row key={i} index={i}>
        {cells}
      </Row>
    );
  }
  return <tbody>{rows}</tbody>;
};

function getPosition(node: HTMLElement) {
  const columnIndex = parseInt(node?.dataset?.column || '0', 10);
  const parentRow = node.parentNode as HTMLTableRowElement;
  const rowIndex = parseInt(parentRow?.dataset?.row || '0', 10);

  return { columnIndex, rowIndex };
}

interface InsertTableProps {
  minRows?: number;
  minColumns?: number;
  maxColumns?: number;
  initialRowCount?: number;
  initialColumnCount?: number;
}

export const InsertTable: FC<InsertTableProps> = ({
  minRows = 2,
  minColumns = 2,
  maxColumns = 10,
  initialRowCount = 4,
  initialColumnCount = 4
}) => {
  const [editor] = useLexicalComposerContext();
  const tableRef = useRef<HTMLTableElement>(null);
  const boundaryTouchedRef = useRef(false);
  const [columnCount, setColumnCount] = useState(initialColumnCount);
  const [rowCount, setRowCount] = useState(initialRowCount);
  const [isOpen, setIsOpen] = useState(false);

  const togglePopper = () => {
    reset();
    setIsOpen(prevState => !prevState);
  };

  const { context, floating, reference, strategy, x, y } = useFloatingUI({
    placement: 'bottom',
    strategy: 'absolute',
    open: isOpen,
    onOpenChange: togglePopper
  });

  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      ancestorScroll: true
    })
  ]);

  const handleCellMouseOver: MouseEventHandler<HTMLDivElement> = event => {
    const target = event.nativeEvent.target as HTMLElement;
    if (!tableRef.current?.contains(target) || !boundaryTouchedRef.current) {
      return;
    }

    const { columnIndex, rowIndex } = getPosition(target);

    if (columnIndex < columnCount && columnIndex >= minColumns) {
      setColumnCount(columnIndex);
    }
    if (rowIndex < rowCount && rowIndex >= minRows) {
      setRowCount(rowIndex);
    }
  };

  function reset() {
    setColumnCount(initialColumnCount);
    setRowCount(initialRowCount);
    boundaryTouchedRef.current = false;
  }

  const addColumn = () => {
    boundaryTouchedRef.current = true;
    if (columnCount + 1 <= maxColumns) {
      setColumnCount(prevState => prevState + 1);
    }
  };

  const addRow = () => {
    boundaryTouchedRef.current = true;
    setRowCount(prevState => prevState + 1);
  };

  const handleSelect = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: columnCount.toString(),
      rows: rowCount.toString()
    });
    reset();
    setIsOpen(false);
  };

  const cellSize = 25;
  const tableHeight = rowCount * cellSize;
  const tableWidth = columnCount * cellSize;

  return (
    <>
      <TextFormatToolbarButton ref={reference} onClick={togglePopper} active={isOpen}>
        <Icon name="grid" />
        <div className={styles.spacer} />
        <Icon name="chevronDown" />
      </TextFormatToolbarButton>
      <Popper
        className={styles.popper}
        ref={floating}
        open={isOpen}
        style={{ top: y ?? '', left: x ?? '', position: strategy }}
        {...getFloatingProps({})}
      >
        <div
          className={styles.tableContainer}
          onMouseOver={handleCellMouseOver}
          onClick={handleSelect}
        >
          <table
            className={styles.table}
            style={{ width: tableWidth, height: tableHeight }}
            ref={tableRef}
          >
            <TableBody rowCount={rowCount} columnCount={columnCount} />
          </table>
          <div className={styles.dimensions}>{`${columnCount} x ${rowCount}`}</div>
          <div
            className={styles.addColumnArea}
            style={{
              left: tableWidth,
              height: tableHeight + cellSize
            }}
            onMouseOver={addColumn}
          />
          <div
            className={styles.addRowArea}
            style={{
              top: tableHeight,
              width: tableWidth + cellSize
            }}
            onMouseOver={addRow}
          />
        </div>
      </Popper>
    </>
  );
};
