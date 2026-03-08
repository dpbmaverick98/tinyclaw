'use client';

import { AgentCard } from './AgentCard';
import { Agent } from '@/types';

interface AgentGridProps {
  agents: Agent[];
}

export function AgentGrid({ agents }: AgentGridProps) {
  // Group agents by team
  const soloAgents = agents.filter((a) => !a.teamId);
  const teamAgents = agents.filter((a) => a.teamId);
  
  // Group team agents by team
  const teamGroups = teamAgents.reduce((acc, agent) => {
    const teamId = agent.teamId!;
    if (!acc[teamId]) acc[teamId] = [];
    acc[teamId].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  return (
    <div className="space-y-8">
      {/* Team Groups */}
      {Object.entries(teamGroups).map(([teamId, members]) => (
        <TeamCluster key={teamId} teamId={teamId} agents={members} />
      ))}

      {/* Solo Agents */}
      {soloAgents.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-white/60 mb-4 px-1">Solo Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {soloAgents.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TeamClusterProps {
  teamId: string;
  agents: Agent[];
}

function TeamCluster({ teamId, agents }: TeamClusterProps) {
  // Sort leader first
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isLeader) return -1;
    if (b.isLeader) return 1;
    return 0;
  });

  return (
    <div className="relative">
      {/* Team connection lines */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={`gradient-${teamId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.3)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedAgents.map((agent, index) => (
          <AgentCard key={agent.id} agent={agent} index={index} />
        ))}
      </div>
    </div>
  );
}
