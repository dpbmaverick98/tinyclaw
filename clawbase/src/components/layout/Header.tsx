'use client';

import { Grid3X3, Network, Activity, Users, Layers, Search, Command, Sun, Moon } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { CreateAgentButton } from '@/components/agents/CreateAgentButton';

interface HeaderProps {
  onViewModeChange?: (mode: 'grid' | 'builder') => void;
  currentView?: string;
}

export function Header({ onViewModeChange, currentView = 'grid' }: HeaderProps) {
  const agents = useClawStore((state) => state.agents);
  const teams = useClawStore((state) => state.teams);
  const theme = useClawStore((state) => state.theme);
  const toggleTheme = useClawStore((state) => state.toggleTheme);

  const activeAgents = agents.filter((a) => a.status === 'active').length;

  return (
    <header className="flex items-center justify-between py-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
          <span className="text-sm font-bold text-white">C</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">ClawBase</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                currentView === 'grid'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid3X3 size={14} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => onViewModeChange('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                currentView === 'builder'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Network size={14} />
              <span>Teams</span>
            </button>
          </div>
        )}

        {/* Stats - minimal */}
        <div className="hidden md:flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-[var(--accent-secondary)]" />
            <span>{activeAgents} active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>{agents.length} agents</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers size={14} />
            <span>{teams.length} teams</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Search */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Search size={16} />
          <span className="text-sm">Search</span>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-xs">
            <Command size={12} className="inline" />K
          </kbd>
        </button>

        <CreateAgentButton />
      </div>
    </header>
  );
}
