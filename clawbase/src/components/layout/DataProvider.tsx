'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClawStore } from '@/stores/useClawStore';
import { useSSE } from '@/hooks/useSSE';
import { fetchAgents, fetchTeams, fetchQueueStatus } from '@/lib/api';
import { Agent } from '@/types';

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Use refs to avoid re-renders
  const setAgentsRef = useRef(useClawStore.getState().setAgents);
  const setTeamsRef = useRef(useClawStore.getState().setTeams);
  const setQueueStatusRef = useRef(useClawStore.getState().setQueueStatus);

  // Fetch initial data with error handling
  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 30000,
    retry: 3,
  });

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    refetchInterval: 30000,
    retry: 3,
  });

  const queueQuery = useQuery({
    queryKey: ['queue'],
    queryFn: fetchQueueStatus,
    refetchInterval: 5000,
    retry: 3,
  });

  // Transform and set data
  useEffect(() => {
    if (!agentsQuery.data) return;
    
    // Create initial agents
    const baseAgents: Agent[] = Object.entries(agentsQuery.data).map(([id, config]) => ({
      id,
      config,
      status: 'idle',
      messageCount: 0,
      fileCount: 0,
    }));

    // If we have teams data, add team info
    if (teamsQuery.data) {
      const teams = Object.entries(teamsQuery.data).map(([id, config]) => ({
        id,
        config,
        agents: config.agents.map((agentId) => ({
          id: agentId,
          config: agentsQuery.data[agentId],
          status: 'idle' as const,
          teamId: id,
          isLeader: agentId === config.leader_agent,
        })),
      }));
      setTeamsRef.current(teams);

      // Update agents with team info
      const agentsWithTeams: Agent[] = baseAgents.map((agent) => {
        const team = teams.find((t) => t.config.agents.includes(agent.id));
        return {
          ...agent,
          teamId: team?.id,
          isLeader: team?.config.leader_agent === agent.id,
        };
      });
      setAgentsRef.current(agentsWithTeams);
    } else {
      setAgentsRef.current(baseAgents);
    }
  }, [agentsQuery.data, teamsQuery.data]);

  // Set queue status
  useEffect(() => {
    if (queueQuery.data) {
      setQueueStatusRef.current(queueQuery.data);
    }
  }, [queueQuery.data]);

  // Connect to SSE
  useSSE();

  // Show connection error if API is not available
  if (agentsQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/20 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Cannot Connect to TinyClaw</h1>
          <p className="text-white/50 mb-4">Make sure the TinyClaw API is running on port 3777</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
