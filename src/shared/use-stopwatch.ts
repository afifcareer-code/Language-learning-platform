"use client";

import { useCallback, useEffect, useRef } from "react";

/** Measures milliseconds since `resetKey` last changed, e.g. since a prompt was shown. */
export function useStopwatch(resetKey: unknown): () => number | null {
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = performance.now();
  }, [resetKey]);
  return useCallback(
    () => (start.current === null ? null : Math.round(performance.now() - start.current)),
    [],
  );
}
