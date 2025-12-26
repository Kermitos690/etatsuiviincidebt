import React, { memo, useRef, ReactNode, CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

function VirtualListInner<T>({
  items,
  renderItem,
  estimateSize = 60,
  overscan = 5,
  className,
  itemClassName,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          const key = getItemKey ? getItemKey(item, virtualRow.index) : virtualRow.index;
          
          return (
            <div
              key={key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={itemClassName}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoized version for performance
export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

// Virtual table row component for large tables
interface VirtualTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  headerHeight?: number;
  header?: ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
}

function VirtualTableInner<T>({
  items,
  renderRow,
  estimateSize = 48,
  overscan = 10,
  className,
  headerHeight = 48,
  header,
  getItemKey,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ contain: 'strict' }}
    >
      <table className="w-full caption-bottom text-sm">
        {header && (
          <thead className="sticky top-0 z-10 bg-background border-b">
            {header}
          </thead>
        )}
        <tbody
          style={{
            display: 'block',
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            const key = getItemKey ? getItemKey(item, virtualRow.index) : virtualRow.index;
            
            return (
              <tr
                key={key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  display: 'table',
                  tableLayout: 'fixed',
                  width: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {renderRow(item, virtualRow.index)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const VirtualTable = memo(VirtualTableInner) as typeof VirtualTableInner;

export default VirtualList;
