import { useEffect, useMemo, useRef } from "react";
import debounce from "lodash.debounce";

type AnyFunction = (...args: never[]) => void;

/**
 * Returns a debounced version of `callback` that stays stable across renders.
 * Pending invocations are cancelled on unmount or when `delayMs` changes.
 */
export function useDebouncedCallback<T extends AnyFunction>(
  callback: T,
  delayMs: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debounced = useMemo(
    () =>
      debounce((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }, delayMs),
    [delayMs]
  );

  useEffect(() => () => debounced.cancel(), [debounced]);

  return debounced as unknown as T;
}
