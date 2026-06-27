import {useCallback, useRef} from 'react';

export function useRafCallback(fn) {
  const fnRef = useRef(fn);
  const frameRef = useRef(0);
  fnRef.current = fn;
  return useCallback((...args) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      fnRef.current(...args);
    });
  }, []);
}
