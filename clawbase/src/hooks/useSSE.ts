'use client';

import { useEffect, useRef } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { createSSEConnection } from '@/lib/api';

export function useSSE() {
  const handleSSEEvent = useClawStore((state) => state.handleSSEEvent);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = createSSEConnection((event) => {
      handleSSEEvent(event);
    });

    esRef.current = es;

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [handleSSEEvent]);

  return esRef.current;
}
