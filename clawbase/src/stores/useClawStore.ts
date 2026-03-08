import { create } from 'zustand';
import { Agent, Team, QueueStatus, SSEEvent } from '@/types';

interface ClawState {
  // Data
  agents: Agent[];
  teams: Team[];
  queueStatus: QueueStatus | null;
  
  // UI State
  selectedAgentId: string | null;
  viewMode: 'grid' | 'list';
  filterProvider: string | null;
  filterStatus: string | null;
  filterTeam: string | null;
  searchQuery: string;
  
  // Actions
  setAgents: (agents: Agent[]) => void;
  setTeams: (teams: Team[]) => void;
  setQueueStatus: (status: QueueStatus) => void;
  updateAgentStatus: (agentId: string, status: Agent['status']) => void;
  incrementAgentActivity: (agentId: string) => void;
  handleSSEEvent: (event: SSEEvent) => void;
  
  // UI Actions
  setSelectedAgentId: (id: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setFilterProvider: (provider: string | null) => void;
  setFilterStatus: (status: string | null) => void;
  setFilterTeam: (team: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Computed
  getFilteredAgents: () => Agent[];
  getAgentById: (id: string) => Agent | undefined;
  getTeamById: (id: string) => Team | undefined;
}

export const useClawStore = create<ClawState>((set, get) => ({
  // Initial state
  agents: [],
  teams: [],
  queueStatus: null,
  selectedAgentId: null,
  viewMode: 'grid',
  filterProvider: null,
  filterStatus: null,
  filterTeam: null,
  searchQuery: '',

  // Data actions
  setAgents: (agents) => set({ agents }),
  setTeams: (teams) => set({ teams }),
  setQueueStatus: (queueStatus) => set({ queueStatus }),

  updateAgentStatus: (agentId, status) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, status, lastActivity: Date.now() } : a
    ),
  })),

  incrementAgentActivity: (agentId) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId
        ? { ...a, messageCount: (a.messageCount || 0) + 1, lastActivity: Date.now() }
        : a
    ),
  })),

  handleSSEEvent: (event) => {
    const { type } = event;
    
    if (type === 'chain_step_start' && event.agentId) {
      get().updateAgentStatus(event.agentId as string, 'active');
    } else if (type === 'chain_step_done' && event.agentId) {
      get().updateAgentStatus(event.agentId as string, 'idle');
      get().incrementAgentActivity(event.agentId as string);
    } else if (type === 'message_enqueued') {
      // Refresh queue status
      fetchQueueStatus().then(get().setQueueStatus);
    }
  },

  // UI actions
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterProvider: (provider) => set({ filterProvider: provider }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterTeam: (team) => set({ filterTeam: team }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Computed
  getFilteredAgents: () => {
    const { agents, filterProvider, filterStatus, filterTeam, searchQuery } = get();
    
    return agents.filter((agent) => {
      if (filterProvider && agent.config.provider !== filterProvider) return false;
      if (filterStatus && agent.status !== filterStatus) return false;
      if (filterTeam && agent.teamId !== filterTeam) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = agent.id.toLowerCase().includes(query);
        const matchesName = agent.config.name.toLowerCase().includes(query);
        const matchesModel = agent.config.model.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesModel) return false;
      }
      return true;
    });
  },

  getAgentById: (id) => get().agents.find((a) => a.id === id),
  getTeamById: (id) => get().teams.find((t) => t.id === id),
}));

async function fetchQueueStatus(): Promise<QueueStatus> {
  const res = await fetch('http://localhost:3777/api/queue/status');
  return res.json();
}
