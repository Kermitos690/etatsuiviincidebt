import { useState, useCallback, useRef, useEffect } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

interface UseSwipeGestureOptions {
  onSwipe: (direction: SwipeDirection) => void;
  threshold?: number;
  disabled?: boolean;
}

export function useSwipeGesture({
  onSwipe,
  threshold = 100,
  disabled = false,
}: UseSwipeGestureOptions) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
  });

  const [direction, setDirection] = useState<SwipeDirection>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    setSwipeState({
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isDragging: true,
    });
  }, [disabled]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!swipeState.isDragging || disabled) return;

    const deltaX = clientX - swipeState.startX;
    const deltaY = clientY - swipeState.startY;

    setSwipeState(prev => ({
      ...prev,
      currentX: clientX,
      currentY: clientY,
    }));

    // Déterminer la direction dominante
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY && absX > 20) {
      setDirection(deltaX > 0 ? 'right' : 'left');
    } else if (absY > absX && absY > 20) {
      setDirection(deltaY > 0 ? 'down' : 'up');
    } else {
      setDirection(null);
    }
  }, [swipeState.isDragging, swipeState.startX, swipeState.startY, disabled]);

  const handleEnd = useCallback(() => {
    if (!swipeState.isDragging || disabled) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = swipeState.currentY - swipeState.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let finalDirection: SwipeDirection = null;

    if (absX > threshold && absX > absY) {
      finalDirection = deltaX > 0 ? 'right' : 'left';
    } else if (absY > threshold && absY > absX) {
      finalDirection = deltaY > 0 ? 'down' : 'up';
    }

    if (finalDirection) {
      onSwipe(finalDirection);
    }

    setSwipeState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
    });
    setDirection(null);
  }, [swipeState, threshold, onSwipe, disabled]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Keyboard navigation
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          onSwipe('right');
          break;
        case 'ArrowLeft':
          onSwipe('left');
          break;
        case 'ArrowUp':
          onSwipe('up');
          break;
        case 'ArrowDown':
          onSwipe('down');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipe, disabled]);

  // Global mouse up listener
  useEffect(() => {
    if (swipeState.isDragging) {
      const handleGlobalMouseUp = () => handleEnd();
      const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [swipeState.isDragging, handleEnd, handleMove]);

  const offset = {
    x: swipeState.isDragging ? swipeState.currentX - swipeState.startX : 0,
    y: swipeState.isDragging ? swipeState.currentY - swipeState.startY : 0,
  };

  const rotation = swipeState.isDragging ? offset.x * 0.05 : 0;

  return {
    ref: elementRef,
    isDragging: swipeState.isDragging,
    direction,
    offset,
    rotation,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
