'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClawStore } from '@/stores/useClawStore';
import { fetchAgents, fetchTeams } from '@/lib/api';
import { Agent, Team, AgentConfig, TeamConfig } from '@/types';

// Demo data for screenshots
const DEMO_AGENTS: Record<string, AgentConfig> = {
  'claude-architect': {
    name: 'Claude Architect',
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251001',
    working_directory: '~/.claw/agents/claude-architect',
    system_prompt: 'You are a senior software architect. Design scalable systems and review code architecture.',
  },
  'code-reviewer': {
    name: 'Code Reviewer',
    provider: 'kimi',
    model: 'kimi-k2.5',
    working_directory: '~/.claw/agents/code-reviewer',
    system_prompt: 'You are a meticulous code reviewer. Find bugs, suggest improvements, enforce best practices.',
  },
  'api-designer': {
    name: 'API Designer',
    provider: 'openai',
    model: 'gpt-4o',
    working_directory: '~/.claw/agents/api-designer',
    system_prompt: 'You design RESTful and GraphQL APIs. Focus on consistency, documentation, and developer experience.',
  },
  'database-expert': {
    name: 'Database Expert',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20251001',
    working_directory: '~/.claw/agents/database-expert',
    system_prompt: 'You are a PostgreSQL expert. Optimize queries, design schemas, plan migrations.',
  },
  'writer': {
    name: 'Technical Writer',
    provider: 'minimax',
    model: 'minimax-text-01',
    working_directory: '~/.claw/agents/writer',
    system_prompt: 'You write clear technical documentation, READMEs, and API docs.',
  },
  'security-guru': {
    name: 'Security Guru',
    provider: 'opencode',
    model: 'opencode-1.5',
    working_directory: '~/.claw/agents/security-guru',
    system_prompt: 'You audit code for security vulnerabilities. Check for OWASP top 10, injection attacks, etc.',
  },
};

const DEMO_TEAMS: Record<string, TeamConfig> = {
  'backend-squad': {
    name: 'Backend Squad',
    agents: ['claude-architect', 'code-reviewer', 'api-designer', 'database-expert'],
    leader_agent: 'claude-architect',
  },
  'security-team': {
    name: 'Security Team',
    agents: ['security-guru', 'code-reviewer'],
    leader_agent: 'security-guru',
  },
};

// Use demo data if API fails
const USE_DEMO_DATA = true;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const setAgentsRef = useRef(useClawStore.getState().setAgents);
  const setTeamsRef = useRef(useClawStore.getState().setTeams);
  const setQueueStatusRef = useRef(useClawStore.getState().setQueueStatus);

  // Fetch initial data with error handling
  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 30000,
    retry: 3,
    enabled: !USE_DEMO_DATA,
  });

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    refetchInterval: 30000,
    retry: 3,
    enabled: !USE_DEMO_DATA,
  });

  // Use demo data or real data
  useEffect(() => {
    let agentData = agentsQuery.data;
    let teamData = teamsQuery.data;

    // Use demo data if API fails or demo mode is on
    if (USE_DEMO_DATA || agentsQuery.isError || !agentData) {
      agentData = DEMO_AGENTS;
      teamData = DEMO_TEAMS;
    }

    if (!agentData) return;
    
    // Create agents
    const baseAgents: Agent[] = Object.entries(agentData).map(([id, config]) => ({
      id,
      config,
      status: Math.random() > 0.7 ? 'active' : 'idle',
      messageCount: Math.floor(Math.random() * 50),
      fileCount: Math.floor(Math.random() * 10),
    }));

    // If we have teams data, add team info
    if (teamData) {
      const teams: Team[] = Object.entries(teamData).map(([id, config]) => ({
        id,
        config,
        agents: config.agents.map((agentId) => ({
          id: agentId,
          config: agentData![agentId],
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

    // Set mock queue status
    setQueueStatusRef.current({
      incoming: 3,
      processing: 1,
      outgoing: 2,
      dead: 0,
      activeConversations: 2,
    });
  }, [agentsQuery.data, teamsQuery.data, agentsQuery.isError]);

  // Connect to SSE (disabled for demo)
  // useSSE();

  // Show connection error only if not using demo data
  if (agentsQuery.isError && !USE_DEMO_DATA) {
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
