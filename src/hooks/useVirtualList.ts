import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualListOptions<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  horizontal?: boolean;
}

export function useVirtualList<T>({
  items,
  estimateSize = 50,
  overscan = 5,
  horizontal = false,
}: UseVirtualListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const getTotalSize = useCallback(() => {
    return virtualizer.getTotalSize();
  }, [virtualizer]);

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => {
      virtualizer.scrollToIndex(index, options);
    },
    [virtualizer]
  );

  return {
    parentRef,
    virtualItems,
    getTotalSize,
    scrollToIndex,
    measureElement: virtualizer.measureElement,
  };
}

export default useVirtualList;
