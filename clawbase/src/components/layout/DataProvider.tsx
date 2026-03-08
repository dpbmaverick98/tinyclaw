'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClawStore } from '@/stores/useClawStore';
import { useSSE } from '@/hooks/useSSE';
import { fetchAgents, fetchTeams, fetchQueueStatus } from '@/lib/api';
import { Agent } from '@/types';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const setAgents = useClawStore((state) => state.setAgents);
  const setTeams = useClawStore((state) => state.setTeams);
  const setQueueStatus = useClawStore((state) => state.setQueueStatus);

  // Fetch initial data
  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 30000,
  });

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    refetchInterval: 30000,
  });

  const queueQuery = useQuery({
    queryKey: ['queue'],
    queryFn: fetchQueueStatus,
    refetchInterval: 5000,
  });

  // Transform and set agents
  useEffect(() => {
    if (agentsQuery.data) {
      const agents: Agent[] = Object.entries(agentsQuery.data).map(([id, config]) => ({
        id,
        config,
        status: 'idle',
        messageCount: 0,
        fileCount: 0,
      }));
      setAgents(agents);
    }
  }, [agentsQuery.data, setAgents]);

  // Transform and set teams
  useEffect(() => {
    if (teamsQuery.data && agentsQuery.data) {
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
      setTeams(teams);

      // Update agents with team info
      const agents: Agent[] = Object.entries(agentsQuery.data).map(([id, config]) => {
        const team = teams.find((t) => t.config.agents.includes(id));
        return {
          id,
          config,
          status: 'idle',
          messageCount: 0,
          fileCount: 0,
          teamId: team?.id,
          isLeader: team?.config.leader_agent === id,
        };
      });
      setAgents(agents);
    }
  }, [teamsQuery.data, agentsQuery.data, setTeams, setAgents]);

  // Set queue status
  useEffect(() => {
    if (queueQuery.data) {
      setQueueStatus(queueQuery.data);
    }
  }, [queueQuery.data, setQueueStatus]);

  // Connect to SSE
  useSSE();

  return <>{children}</>;
}
