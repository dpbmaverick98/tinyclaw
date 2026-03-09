'use client';

import { useEffect, useRef, useState } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { getAgents, getTeams, createEventSource } from '@/lib/api';

// Demo data for when server is not available
const DEMO_AGENTS = [
  { id: 'claude', name: 'claude', provider: 'anthropic' as const, model: 'claude-sonnet-4-5', status: 'idle' as const },
  { id: 'kimi', name: 'kimi', provider: 'kimi' as const, model: 'kimi-k2.5', status: 'idle' as const },
  { id: 'writer', name: 'writer', provider: 'openai' as const, model: 'gpt-4o', status: 'idle' as const },
  { id: 'guru', name: 'guru', provider: 'opencode' as const, model: 'opencode-1.5', status: 'idle' as const },
];

const DEMO_TEAMS = [
  { id: 'backend', name: 'backend', agentIds: ['claude', 'kimi'] },
  { id: 'security', name: 'security', agentIds: ['guru'] },
];

export function useSSE() {
  const { 
    setAgents, 
    setTeams, 
    setConnected,
    addMessage, 
    addNotification,
    updateAgentTask,
    addAgent,
    addTeam,
  } = useClawStore();
  
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [useDemo, setUseDemo] = useState(false);
  
  useEffect(() => {
    // If we've tried 3 times and failed, use demo data
    if (reconnectAttempts >= 3 && !useDemo) {
      console.log('Server not available, using demo data');
      setUseDemo(true);
      setAgents(DEMO_AGENTS);
      setTeams(DEMO_TEAMS);
      return;
    }

    if (useDemo) return;

    let isActive = true;
    
    const connect = async () => {
      try {
        // Load initial data
        const [agents, teams] = await Promise.all([
          getAgents(),
          getTeams(),
        ]);
        
        if (!isActive) return;
        
        // Transform API data to store format
        setAgents(agents.map(a => ({
          id: a.id,
          name: a.name,
          provider: a.provider as 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax',
          model: a.model,
          status: 'idle',
        })));
        
        setTeams(teams.map(t => ({
          id: t.id,
          name: t.name,
          agentIds: t.agents,
        })));
        
        setReconnectAttempts(0);
        
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setReconnectAttempts(prev => prev + 1);
        // Will retry via SSE reconnection
      }
      
      // Connect to SSE
      try {
        const es = createEventSource();
        esRef.current = es;
        
        es.onopen = () => {
          console.log('SSE connected');
          setConnected(true);
          setReconnectAttempts(0);
        };
        
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleEvent(data);
          } catch (error) {
            console.error('Failed to parse SSE event:', error);
          }
        };
        
        es.onerror = () => {
          console.log('SSE error, will reconnect...');
          setConnected(false);
          es.close();
          setReconnectAttempts(prev => prev + 1);
          
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isActive) connect();
          }, 3000);
        };
      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        setReconnectAttempts(prev => prev + 1);
      }
    };
    
    const handleEvent = (data: { type: string; [key: string]: unknown }) => {
      switch (data.type) {
        case 'message_received':
          // Add message to appropriate pane
          addMessage(String(data.paneId || `pane-${data.agentId}`), {
            id: String(data.messageId),
            role: 'agent',
            content: String(data.content),
            timestamp: Number(data.timestamp) || Date.now(),
          });
          
          // Add notification if pane not active
          addNotification({
            id: `notif-${data.messageId}`,
            agentId: String(data.agentId),
            agentName: String(data.agentName),
            preview: String(data.content).slice(0, 100),
            timestamp: Date.now(),
            read: false,
          });
          break;
          
        case 'agent_created':
          addAgent({
            id: String(data.id),
            name: String(data.name),
            provider: data.provider as 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax',
            model: String(data.model),
            status: 'idle',
          });
          break;
          
        case 'team_created':
          addTeam({
            id: String(data.id),
            name: String(data.name),
            agentIds: data.agents as string[],
          });
          break;
          
        case 'agent_status_changed':
          updateAgentTask(String(data.agentId), data.task as string | undefined);
          break;
          
        case 'agent_typing':
          // Could show typing indicator
          break;
          
        default:
          console.log('Unknown event type:', data.type);
      }
    };
    
    connect();
    
    return () => {
      isActive = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, [setAgents, setTeams, setConnected, addMessage, addNotification, updateAgentTask, addAgent, addTeam, reconnectAttempts, useDemo]);
  
  return { connected: !!esRef.current && !useDemo, useDemo };
}
