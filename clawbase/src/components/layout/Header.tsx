'use client';

import { Search, Command, Activity, Layers, Users, Grid3X3, Network } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { CreateAgentButton } from '@/components/agents/CreateAgentButton';

interface HeaderProps {
  onViewModeChange?: (mode: 'grid' | 'team' | 'builder') => void;
  currentView?: string;
}

export function Header({ onViewModeChange, currentView = 'grid' }: HeaderProps) {
  const queueStatus = useClawStore((state) => state.queueStatus);
  const agents = useClawStore((state) => state.agents);
  const teams = useClawStore((state) => state.teams);

  const activeAgents = agents.filter((a) => a.status === 'active').length;

  return (
    <header className="flex items-center justify-between py-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-xl font-bold text-white">◉</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">ClawBase</h1>
          <p className="text-xs text-white/50">Agent Command Center</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'grid'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Grid3X3 size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => onViewModeChange('builder')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'builder'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Network size={16} />
              <span className="hidden sm:inline">Teams</span>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Activity size={16} className="text-green-400" />
            <span className="text-white/60">{activeAgents} active</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} className="text-blue-400" />
            <span className="text-white/60">{agents.length} agents</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Layers size={16} className="text-purple-400" />
            <span className="text-white/60">{teams.length} teams</span>
          </div>
          {queueStatus && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-white/60">{queueStatus.incoming} queued</span>
            </div>
          )}
        </div>

        {/* Search */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
        >
          <Search size={18} />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded bg-white/10 text-xs">
            <Command size={12} className="inline" />K
          </kbd>
        </button>

        <CreateAgentButton />
      </div>
    </header>
  );
}
