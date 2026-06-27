import {useLayoutEffect, useState} from 'react';

export function useElementSize(ref) {
  const [size, setSize] = useState({width: 0, height: 0});
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setSize({width, height});
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
