'use client';

import { useState, useEffect } from 'react';
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
  const filteredAgents = useClawStore((state) => state.getFilteredAgents());

  // Handle view mode changes
  useEffect(() => {
    if (selectedAgentId) {
      setViewMode('agent');
    } else if (viewMode === 'agent') {
      setViewMode('grid');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId]);

  // Listen for custom events
  useEffect(() => {
    const handleViewTeam = (e: CustomEvent<string>) => {
      setSelectedTeamId(e.detail);
      setViewMode('team');
      setSelectedAgentId(null);
    };

    const handleOpenBuilder = () => {
      setViewMode('builder');
      setSelectedAgentId(null);
    };

    window.addEventListener('view-team', handleViewTeam as EventListener);
    window.addEventListener('open-team-builder', handleOpenBuilder);

    return () => {
      window.removeEventListener('view-team', handleViewTeam as EventListener);
      window.removeEventListener('open-team-builder', handleOpenBuilder);
    };
  }, [setSelectedAgentId]);

  const handleCloseDetail = () => {
    setSelectedAgentId(null);
    setViewMode('grid');
  };

  const handleCloseTeam = () => {
    setSelectedTeamId(null);
    setViewMode('grid');
  };

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-4">
      <Header 
        onViewModeChange={setViewMode}
        currentView={viewMode}
      />
      <CommandPalette />
      
      {viewMode === 'agent' && selectedAgentId ? (
        <AgentDetail onClose={handleCloseDetail} />
      ) : viewMode === 'team' && selectedTeamId ? (
        <TeamTopology 
          teamId={selectedTeamId} 
          onClose={handleCloseTeam}
        />
      ) : viewMode === 'builder' ? (
        <TeamBuilder onClose={() => setViewMode('grid')} />
      ) : (
        <>
          {filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center h-[60vh] text-white/30">
              <div className="text-center">
                <p className="text-xl mb-2">No agents found</p>
                <p className="text-sm">Create your first agent to get started</p>
              </div>
            </div>
          ) : (
            <AgentGrid 
              agents={filteredAgents} 
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
