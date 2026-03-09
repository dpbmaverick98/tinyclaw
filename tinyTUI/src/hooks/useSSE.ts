'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { getAgents, getTeams, subscribeToEvents, type AgentConfig } from '@/lib/api';

// Demo data for when server is not available
const DEMO_AGENTS: Record<string, AgentConfig> = {
  claude: { name: 'claude', provider: 'anthropic', model: 'claude-sonnet-4-5', working_directory: '~/.claw/agents/claude' },
  kimi: { name: 'kimi', provider: 'kimi', model: 'kimi-k2.5', working_directory: '~/.claw/agents/kimi' },
  writer: { name: 'writer', provider: 'openai', model: 'gpt-4o', working_directory: '~/.claw/agents/writer' },
  guru: { name: 'guru', provider: 'opencode', model: 'opencode-1.5', working_directory: '~/.claw/agents/guru' },
};

const DEMO_TEAMS: Record<string, { name: string; agents: string[] }> = {
  backend: { name: 'backend', agents: ['claude', 'kimi'] },
  security: { name: 'security', agents: ['guru'] },
};

// Convert Record to array with IDs
function recordToArray<T>(record: Record<string, T>): Array<T & { id: string }> {
  return Object.entries(record).map(([id, data]) => ({ id, ...data }));
}

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
  
  const [useDemo, setUseDemo] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Polling function
  const pollData = useCallback(async () => {
    if (useDemo) return;
    
    try {
      const [agentsRecord, teamsRecord] = await Promise.all([
        getAgents(),
        getTeams(),
      ]);
      
      // Convert Record to array with IDs
      const agents = recordToArray(agentsRecord).map(a => ({
        id: a.id,
        name: a.name,
        provider: a.provider as 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax',
        model: a.model,
        status: 'idle' as const,
      }));
      
      const teams = recordToArray(teamsRecord).map(t => ({
        id: t.id,
        name: t.name,
        agentIds: (t as { agents?: string[] }).agents || [],
      }));
      
      setAgents(agents);
      setTeams(teams);
      setConnected(true);
      setErrorCount(0);
    } catch (error) {
      console.error('Poll error:', error);
      setErrorCount(c => c + 1);
      setConnected(false);
      
      // After 3 errors, use demo data
      if (errorCount >= 2) {
        console.log('Server not available, using demo data');
        setUseDemo(true);
        setAgents(recordToArray(DEMO_AGENTS).map(a => ({ 
          id: a.id,
          name: a.name,
          provider: a.provider as 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax',
          model: a.model,
          status: 'idle' as const 
        })));
        setTeams(recordToArray(DEMO_TEAMS).map(t => ({ id: t.id, name: t.name, agentIds: (t as { agents: string[] }).agents })));
      }
    }
  }, [setAgents, setTeams, setConnected, errorCount, useDemo]);
  
  // Initial load + polling
  useEffect(() => {
    // Initial load
    pollData();
    
    // Poll every 5 seconds
    const interval = setInterval(pollData, 5000);
    
    return () => clearInterval(interval);
  }, [pollData]);
  
  // SSE subscription
  useEffect(() => {
    if (useDemo) return;

    const handleEvent = (event: { type: string; [key: string]: unknown }) => {
      switch (event.type) {
        case 'message_received':
        case 'response_ready':
          // Add message to appropriate pane
          addMessage(String(event.paneId || `pane-${event.agentId}`), {
            id: String(event.messageId || Date.now()),
            role: 'agent',
            content: String(event.content || event.message || ''),
            timestamp: Number(event.timestamp) || Date.now(),
          });

          // Add notification
          addNotification({
            id: `notif-${event.messageId || Date.now()}`,
            agentId: String(event.agentId || ''),
            agentName: String(event.agentName || event.agent || ''),
            preview: String(event.content || event.message || '').slice(0, 100),
            timestamp: Date.now(),
            read: false,
          });
          break;

        case 'agent_created':
          addAgent({
            id: String(event.id),
            name: String(event.name),
            provider: (event.provider as 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax') || 'anthropic',
            model: String(event.model || ''),
            status: 'idle',
          });
          break;

        case 'team_created':
          addTeam({
            id: String(event.id),
            name: String(event.name),
            agentIds: (event.agents as string[]) || [],
          });
          break;

        case 'agent_status_changed':
          updateAgentTask(String(event.agentId), event.task as string | undefined);
          break;

        default:
          // Other events: agent_routed, chain_step_start, etc.
          console.log('[SSE] Event:', event.type, event);
      }
    };

    const unsubscribe = subscribeToEvents(
      (event) => {
        handleEvent(event);
      },
      () => {
        setConnected(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [useDemo, addMessage, addNotification, addAgent, addTeam, updateAgentTask, setConnected]);
  
  return { connected: !useDemo, useDemo };
}
