'use client';

import { ChevronRight, Users } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { Agent, Team } from '@/types';
import { useClawStore } from '@/stores/useClawStore';

interface AgentGridProps {
  agents: Agent[];
  onViewTeam?: (teamId: string) => void;
}

export function AgentGrid({ agents, onViewTeam }: AgentGridProps) {
  const teams = useClawStore((state) => state.teams);
  
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
      {Object.entries(teamGroups).map(([teamId, members]) => {
        const team = teams.find((t) => t.id === teamId);
        if (!team) return null;
        
        return (
          <TeamSection
            key={teamId}
            team={team}
            members={members}
            onViewTeam={onViewTeam}
          />
        );
      })}

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

interface TeamSectionProps {
  team: Team;
  members: Agent[];
  onViewTeam?: (teamId: string) => void;
}

function TeamSection({ team, members, onViewTeam }: TeamSectionProps) {
  // Sort leader first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.isLeader) return -1;
    if (b.isLeader) return 1;
    return 0;
  });

  const activeCount = members.filter((m) => m.status === 'active').length;

  return (
    <div className="relative">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Users size={16} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">{team.config.name}</h2>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span>{members.length} agents</span>
              <span>•</span>
              <span className="text-blue-400">{activeCount} active</span>
            </div>
          </div>
        </div>

        {onViewTeam && (
          <button
            onClick={() => onViewTeam(team.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            View Topology
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Connection Lines (visual only) */}
      <div className="hidden lg:block absolute top-16 left-0 right-0 h-px">
        <div 
          className="h-full bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-purple-500/30"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        />
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedMembers.map((agent, index) => (
          <AgentCard key={agent.id} agent={agent} index={index} />
        ))}
      </div>
    </div>
  );
}
