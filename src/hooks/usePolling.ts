'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
}

export function usePolling(
  callback: () => Promise<void> | void,
  { interval = 3000, enabled = true }: UsePollingOptions = {}
) {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const startPolling = useCallback(() => {
    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    if (enabled) {
      tick().catch(console.error); // Run immediately
      intervalRef.current = setInterval(tick, interval);
    }
  }, [interval, enabled]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [startPolling, stopPolling, enabled]);

  return { startPolling, stopPolling };
}
