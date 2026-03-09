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

// Generate fingerprint for deduplication (include timestamp like TinyOffice)
function getEventFingerprint(event: { type: string; [key: string]: unknown }): string {
  const e = event as Record<string, unknown>;
  return `${event.type}:${e.timestamp ?? ''}:${e.messageId ?? e.message_id ?? ''}:${e.agentId ?? e.agent ?? ''}`;
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
  
  // Shared deduplication set for BOTH polling and SSE
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  // Use ref to avoid stale closure issues with panes
  const panesRef = useRef(panes);
  panesRef.current = panes;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  
  // Helper to check and mark event as processed
  const isProcessed = useCallback((fingerprint: string): boolean => {
    if (processedEventsRef.current.has(fingerprint)) return true;
    processedEventsRef.current.add(fingerprint);
    
    // Keep set size manageable
    if (processedEventsRef.current.size > 500) {
      const entries = Array.from(processedEventsRef.current);
      processedEventsRef.current = new Set(entries.slice(-300));
    }
    return false;
  }, []);
  
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
  
  // Polling function for responses - only used when SSE is not connected
  const pollResponses = useCallback(async () => {
    // Skip polling if SSE is connected (useDemo is false and we have a subscription)
    if (useDemo || panesRef.current.length === 0 || unsubscribeRef.current) return;
    
    try {
      const responses = await getResponses(50);
      
      for (const response of responses) {
        // Generate fingerprint for deduplication (include timestamp like TinyOffice)
        const fingerprint = `poll:${response.timestamp}:${response.messageId}:${response.agentId}`;
        if (isProcessed(fingerprint)) continue;
        
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
    } catch {
      // Silently fail - responses will come via SSE if available
    }
  }, [useDemo, addMessage, addNotification, isProcessed]);
  
  // Initial load + polling
  useEffect(() => {
    // Initial load
    pollData();
    
    // Poll every 5 seconds for agents/teams
    const dataInterval = setInterval(pollData, 5000);
    
    // Poll every 2 seconds for responses (only when SSE not connected)
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
      // Deduplicate events
      const fingerprint = getEventFingerprint(event);
      if (isProcessed(fingerprint)) {
        console.log('[SSE] Duplicate event skipped:', event.type, fingerprint);
        return;
      }

      switch (event.type) {
        case 'message_received': {
          // Handle user messages - no response text here
          break;
        }

        // response_ready removed - chain_step_done handles all agent responses

        case 'chain_step_start': {
          // Use chain_step_start as typing indicator ONLY (no message adding)
          const agentId = String(event.agentId || event.agent || '');
          if (agentId) {
            console.log('[SSE] Agent started typing:', agentId);
            setAgentTyping(agentId, true);
          }
          break;
        }

        case 'chain_step_done': {
          // chain_step_done has responseText for team agents
          // Use it when responseText is present (team agent responses)
          const responseText = String(event.responseText || '');
          if (!responseText) {
            // No response text - just metadata, skip
            break;
          }
          
          const agentId = String(event.agentId || event.agent || '');
          if (!agentId) break;
          
          // Clear typing indicator
          setAgentTyping(agentId, false);
          
          // Find pane for this agent
          const pane = panesRef.current.find(p => p.agentId === agentId);
          if (!pane) break;
          
          console.log('[SSE] Adding message from chain_step_done to pane:', pane.id, 'content:', responseText.slice(0, 50));
          
          // Add message to pane
          addMessage(pane.id, {
            id: String(event.messageId || `chain-${Date.now()}`),
            role: 'agent',
            content: responseText,
            timestamp: Number(event.timestamp) || Date.now(),
          });
          
          // Add notification
          addNotification({
            id: `notif-${event.messageId || Date.now()}`,
            agentId: agentId,
            agentName: String(event.agentName || event.agent || ''),
            preview: responseText.slice(0, 100),
            timestamp: Date.now(),
            read: false,
          });
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
          // Other events: agent_routed, chain_handoff, chain_step_done, etc.
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
  }, [useDemo, addMessage, addNotification, addAgent, addTeam, updateAgentTask, setAgentTyping, setConnected, isProcessed]);
  
  return { connected: !useDemo, useDemo };
}
