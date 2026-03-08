'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { AgentGrid } from '@/components/agents/AgentGrid';
import { AgentDetail } from '@/components/agents/AgentDetail';
import { TeamTopology } from '@/components/teams/TeamTopology';
import { TeamBuilder } from '@/components/teams/TeamBuilder';
import { useClawStore } from '@/stores/useClawStore';

type ViewMode = 'grid' | 'agent' | 'team' | 'builder';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  const selectedAgentId = useClawStore((state) => state.selectedAgentId);
  const setSelectedAgentId = useClawStore((state) => state.setSelectedAgentId);
  const agents = useClawStore((state) => state.agents);

  const handleCloseDetail = () => {
    setSelectedAgentId(null);
    setViewMode('grid');
  };

  const handleCloseTeam = () => {
    setSelectedTeamId(null);
    setViewMode('grid');
  };

  // Show agent detail when agent is selected
  if (selectedAgentId) {
    return (
      <main className="max-w-[1600px] mx-auto px-6 py-4">
        <Header 
          onViewModeChange={setViewMode}
          currentView={viewMode}
        />
        <CommandPalette />
        <AgentDetail onClose={handleCloseDetail} />
      </main>
    );
  }

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-4">
      <Header 
        onViewModeChange={setViewMode}
        currentView={viewMode}
      />
      <CommandPalette />
      
      {viewMode === 'team' && selectedTeamId ? (
        <TeamTopology 
          teamId={selectedTeamId} 
          onClose={handleCloseTeam}
        />
      ) : viewMode === 'builder' ? (
        <TeamBuilder onClose={() => setViewMode('grid')} />
      ) : (
        <>
          {agents.length === 0 ? (
            <div className="flex items-center justify-center h-[60vh] text-white/30">
              <div className="text-center">
                <p className="text-xl mb-2">No agents found</p>
                <p className="text-sm">Create your first agent to get started</p>
              </div>
            </div>
          ) : (
            <AgentGrid 
              agents={agents}
              onViewTeam={(teamId) => {
                setSelectedTeamId(teamId);
                setViewMode('team');
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
