import { useEffect, useRef } from 'react';

/**
 * Hook to add tutorial data attribute to an element
 * @param tutorialId - The tutorial ID to use for targeting
 * @returns ref to attach to the element
 */
export function useTutorialHighlight<T extends HTMLElement>(tutorialId: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('data-tutorial', tutorialId);
    }
  }, [tutorialId]);

  return ref;
}

/**
 * Simple HOC props to add tutorial targeting
 */
export function getTutorialProps(tutorialId: string) {
  return {
    'data-tutorial': tutorialId,
  };
}
