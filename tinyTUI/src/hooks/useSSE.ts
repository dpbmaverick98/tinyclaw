'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { getAgents, getTeams, getResponses, subscribeToEvents, type AgentConfig } from '@/lib/api';

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
    setAgentTyping,
    addAgent,
    addTeam,
    panes,
    teams,
  } = useClawStore();
  
  const [useDemo, setUseDemo] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const processedResponsesRef = useRef<Set<string>>(new Set());
  
  // Use ref to avoid stale closure issues with panes
  const panesRef = useRef(panes);
  panesRef.current = panes;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  
  // Polling function for agents/teams
  const pollData = useCallback(async () => {
    if (useDemo) return;
    
    try {
      const [agentsRecord, teamsRecord] = await Promise.all([
        getAgents(),
        getTeams(),
      ]);
      
      // Convert Record to array with IDs
      const newAgents = recordToArray(agentsRecord).map(a => ({
        id: a.id,
        name: a.name,
        provider: a.provider as 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax',
        model: a.model,
        status: 'idle' as const,
      }));
      
      const newTeams = recordToArray(teamsRecord).map(t => ({
        id: t.id,
        name: t.name,
        agentIds: (t as { agents?: string[] }).agents || [],
      }));
      
      setAgents(newAgents);
      setTeams(newTeams);
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
  
  // Polling function for responses
  const pollResponses = useCallback(async () => {
    if (useDemo || panesRef.current.length === 0) return;
    
    try {
      const responses = await getResponses(50);
      
      for (const response of responses) {
        // Skip if already processed
        if (processedResponsesRef.current.has(response.messageId)) continue;
        processedResponsesRef.current.add(response.messageId);
        
        // Find pane for this agent using ref to avoid stale closure
        const pane = panesRef.current.find(p => p.agentId === response.agentId);
        if (!pane) continue;
        
        // Add message to pane
        addMessage(pane.id, {
          id: `resp-${response.messageId}`,
          role: 'agent',
          content: response.responseText,
          timestamp: response.timestamp,
        });
        
        // Add notification if pane not active
        addNotification({
          id: `notif-${response.messageId}`,
          agentId: response.agentId,
          agentName: response.agentName,
          preview: response.responseText.slice(0, 100),
          timestamp: Date.now(),
          read: false,
        });
      }
      
      // Keep set size manageable
      if (processedResponsesRef.current.size > 200) {
        const entries = Array.from(processedResponsesRef.current);
        processedResponsesRef.current = new Set(entries.slice(-100));
      }
    } catch {
      // Silently fail - responses will come via SSE if available
    }
  }, [useDemo, addMessage, addNotification]);
  
  // Initial load + polling
  useEffect(() => {
    // Initial load
    pollData();
    
    // Poll every 5 seconds for agents/teams
    const dataInterval = setInterval(pollData, 5000);
    
    // Poll every 2 seconds for responses
    const responseInterval = setInterval(pollResponses, 2000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(responseInterval);
    };
  }, [pollData, pollResponses]);
  
  // SSE subscription
  useEffect(() => {
    if (useDemo) return;

    const handleEvent = (event: { type: string; [key: string]: unknown }) => {
      switch (event.type) {
        case 'message_received':
        case 'response_ready':
        case 'chain_step_done': {
          // Get agent ID from event
          const agentId = String(event.agentId || event.agent || '');
          if (!agentId) return;
          
          // Clear typing indicator for this agent
          setAgentTyping(agentId, false);
          
          // Find pane for this agent using ref to avoid stale closure
          const pane = panesRef.current.find(p => p.agentId === agentId);
          if (!pane) {
            console.log('[SSE] No pane found for agent:', agentId, 'Available panes:', panesRef.current.map(p => p.agentId));
            return;
          }
          
          // Get response text - check multiple possible field names
          const content = String(
            event.responseText || 
            event.content || 
            event.message || 
            event.text || 
            ''
          );
          
          if (!content) {
            console.log('[SSE] No content in event:', event);
            return;
          }
          
          console.log('[SSE] Adding message to pane:', pane.id, 'content:', content.slice(0, 50));
          
          // Add message to pane
          addMessage(pane.id, {
            id: String(event.messageId || `sse-${Date.now()}`),
            role: 'agent',
            content: content,
            timestamp: Number(event.timestamp) || Date.now(),
          });
          
          // Add notification
          addNotification({
            id: `notif-${event.messageId || Date.now()}`,
            agentId: agentId,
            agentName: String(event.agentName || event.agent || ''),
            preview: content.slice(0, 100),
            timestamp: Date.now(),
            read: false,
          });
          break;
        }

        case 'chain_step_start': {
          // Use chain_step_start as typing indicator
          const agentId = String(event.agentId || event.agent || '');
          if (agentId) {
            console.log('[SSE] Agent started typing:', agentId);
            setAgentTyping(agentId, true);
          }
          break;
        }

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

        case 'agent_typing':
          console.log('[SSE] Agent typing:', event.agentId || event.agent);
          setAgentTyping(String(event.agentId || event.agent), true);
          // Auto-clear typing after 5 seconds if no response
          setTimeout(() => {
            setAgentTyping(String(event.agentId || event.agent), false);
          }, 5000);
          break;

        default:
          // Other events: agent_routed, chain_handoff, etc.
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
  }, [useDemo, addMessage, addNotification, addAgent, addTeam, updateAgentTask, setAgentTyping, setConnected]);
  
  return { connected: !useDemo, useDemo };
}
