import { useState, useCallback, useRef } from 'react';

export function useHistory<T>(maxSize = 50) {
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const pastRef = useRef(past);
  const futureRef = useRef(future);
  pastRef.current = past;
  futureRef.current = future;

  const push = useCallback((state: T) => {
    setPast(prev => [...prev.slice(-(maxSize - 1)), state]);
    setFuture([]); // clear redo stack on new action
  }, [maxSize]);

  const undo = useCallback((currentState: T): T | null => {
    const currentPast = pastRef.current;
    if (currentPast.length === 0) return null;
    const previous = currentPast[currentPast.length - 1];
    setPast(currentPast.slice(0, -1));
    setFuture(prev => [currentState, ...prev]);
    return previous;
  }, []);

  const redo = useCallback((currentState: T): T | null => {
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return null;
    const next = currentFuture[0];
    setFuture(currentFuture.slice(1));
    setPast(prev => [...prev, currentState]);
    return next;
  }, []);

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
