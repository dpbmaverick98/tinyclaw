'use client';

import { useState } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { deleteAgent, deleteTeam } from '@/lib/api';

export function Sidebar() {
  const { 
    agents, 
    teams, 
    sidebarExpanded, 
    toggleSidebar, 
    openPane, 
    openModal,
    removeAgent,
    removeTeam,
  } = useClawStore();
  
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const standaloneAgents = agents.filter(a => 
    !teams.some(t => t.agentIds.includes(a.id))
  );
  
  const workingAgents = agents.filter(a => a.status === 'working');
  
  const handleDeleteAgent = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete agent "${agentId}"?`)) return;
    
    setDeleting(agentId);
    try {
      await deleteAgent(agentId);
      removeAgent(agentId);
    } catch (err) {
      alert('Failed to delete agent: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };
  
  const handleDeleteTeam = async (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete team "${teamId}"?`)) return;
    
    setDeleting(teamId);
    try {
      await deleteTeam(teamId);
      removeTeam(teamId);
    } catch (err) {
      alert('Failed to delete team: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };
  
  return (
    <aside className="w-56 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col">
      {/* Agents Section */}
      <div className="border-b border-[var(--border-color)]">
        <button
          onClick={() => toggleSidebar('agents')}
          className="w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-xs uppercase tracking-wide"
        >
          {sidebarExpanded.agents ? '-' : '+'} agents
        </button>
        
        {sidebarExpanded.agents && (
          <div className="pb-2">
            {standaloneAgents.map(agent => (
              <div
                key={agent.id}
                className="group flex items-center justify-between px-6 py-1 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <button
                  onClick={() => openPane(agent.id)}
                  className="flex-1 text-left text-[var(--text-primary)] text-sm"
                >
                  {'>'} {agent.name}
                </button>
                <button
                  onClick={(e) => handleDeleteAgent(agent.id, e)}
                  disabled={deleting === agent.id}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 text-xs transition-opacity"
                  title="Delete agent"
                >
                  {deleting === agent.id ? '...' : 'x'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Teams Section */}
      <div className="border-b border-[var(--border-color)]">
        <button
          onClick={() => toggleSidebar('teams')}
          className="w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-xs uppercase tracking-wide"
        >
          {sidebarExpanded.teams ? '-' : '+'} teams
        </button>
        
        {sidebarExpanded.teams && (
          <div className="pb-2">
            {teams.map(team => (
              <div key={team.id}>
                <div className="group flex items-center justify-between px-6 py-1">
                  <span className="text-[var(--text-secondary)] text-sm">
                    + {team.name}
                  </span>
                  <button
                    onClick={(e) => handleDeleteTeam(team.id, e)}
                    disabled={deleting === team.id}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 text-xs transition-opacity"
                    title="Delete team"
                  >
                    {deleting === team.id ? '...' : 'x'}
                  </button>
                </div>
                {team.agentIds.map(agentId => {
                  const agent = agents.find(a => a.id === agentId);
                  if (!agent) return null;
                  return (
                    <button
                      key={agentId}
                      onClick={() => openPane(agentId)}
                      className="w-full px-9 py-1 text-left text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-sm"
                    >
                      {'>'} {agent.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Active Tasks Section */}
      <div className="border-b border-[var(--border-color)] flex-1">
        <button
          onClick={() => toggleSidebar('active')}
          className="w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-xs uppercase tracking-wide"
        >
          {sidebarExpanded.active ? '-' : '+'} active
        </button>
        
        {sidebarExpanded.active && (
          <div className="pb-2">
            {workingAgents.length === 0 && (
              <div className="px-6 py-1 text-[var(--text-muted)] text-sm">
                no active tasks
              </div>
            )}
            {workingAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => openPane(agent.id)}
                className="w-full px-6 py-1 text-left hover:bg-[var(--bg-tertiary)] transition-colors text-sm"
              >
                <div className="text-[var(--text-primary)]">{agent.name}</div>
                <div className="text-[var(--text-muted)] text-xs truncate">
                  {agent.currentTask}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Button */}
      <button
        onClick={() => openModal('agent')}
        className="m-3 px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors text-sm text-center"
      >
        + new
      </button>
    </aside>
  );
}
