'use client';

import { useEffect, useRef } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { createSSEConnection } from '@/lib/api';

export function useSSE() {
  const esRef = useRef<EventSource | null>(null);
  const updateAgentStatusRef = useRef(useClawStore.getState().updateAgentStatus);
  const incrementAgentActivityRef = useRef(useClawStore.getState().incrementAgentActivity);

  useEffect(() => {
    // Keep refs up to date
    updateAgentStatusRef.current = useClawStore.getState().updateAgentStatus;
    incrementAgentActivityRef.current = useClawStore.getState().incrementAgentActivity;
  });

  useEffect(() => {
    const es = createSSEConnection((event) => {
      const { type } = event;
      
      if (type === 'chain_step_start' && event.agentId) {
        updateAgentStatusRef.current(event.agentId as string, 'active');
      } else if (type === 'chain_step_done' && event.agentId) {
        updateAgentStatusRef.current(event.agentId as string, 'idle');
        incrementAgentActivityRef.current(event.agentId as string);
      }
    });
    
    esRef.current = es;

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []); // Empty deps - only run once

  return esRef.current;
}
