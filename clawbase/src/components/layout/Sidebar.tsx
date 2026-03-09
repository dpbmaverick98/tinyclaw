'use client';

import { useClawStore } from '@/stores/useClawStore';

export function Sidebar() {
  const { 
    agents, 
    teams, 
    sidebarExpanded, 
    toggleSidebar, 
    openPane, 
    openModal 
  } = useClawStore();
  
  const standaloneAgents = agents.filter(a => 
    !teams.some(t => t.agentIds.includes(a.id))
  );
  
  const workingAgents = agents.filter(a => a.status === 'working');
  
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
              <button
                key={agent.id}
                onClick={() => openPane(agent.id)}
                className="w-full px-6 py-1 text-left text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-sm"
              >
                {'>'} {agent.name}
              </button>
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
                <div className="px-6 py-1 text-[var(--text-secondary)] text-sm">
                  + {team.name}
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
