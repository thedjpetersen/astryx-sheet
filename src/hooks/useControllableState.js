import {useCallback, useState} from 'react';

export function useControllableState({value, defaultValue, onChange}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  const setValue = useCallback((nextValue) => {
    const resolvedValue = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
    if (!isControlled) setUncontrolledValue(resolvedValue);
    onChange?.(resolvedValue);
  }, [currentValue, isControlled, onChange]);

  return [currentValue, setValue];
}
