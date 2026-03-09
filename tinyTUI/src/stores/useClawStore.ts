import { create } from 'zustand';
import { Agent, Team, ChatPane, Notification, Message } from '@/types';

interface ClawState {
  // Data
  agents: Agent[];
  teams: Team[];
  connected: boolean;
  
  // Panes
  panes: ChatPane[];
  activePaneId: string | null;
  
  // UI
  sidebarExpanded: {
    agents: boolean;
    teams: boolean;
    active: boolean;
  };
  
  // Notifications
  notifications: Notification[];
  showNotifications: boolean;
  
  // Modal
  modalOpen: boolean;
  modalTab: 'agent' | 'team';
  
  // Actions
  setAgents: (agents: Agent[]) => void;
  setTeams: (teams: Team[]) => void;
  setConnected: (connected: boolean) => void;
  addAgent: (agent: Agent) => void;
  addTeam: (team: Team) => void;
  openPane: (agentId: string) => void;
  closePane: (paneId: string) => void;
  setActivePane: (paneId: string) => void;
  updatePaneInput: (paneId: string, input: string) => void;
  addMessage: (paneId: string, message: Message) => void;
  markPaneRead: (paneId: string) => void;
  toggleSidebar: (section: 'agents' | 'teams' | 'active') => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setShowNotifications: (show: boolean) => void;
  openModal: (tab?: 'agent' | 'team') => void;
  closeModal: () => void;
  setModalTab: (tab: 'agent' | 'team') => void;
  updateAgentTask: (agentId: string, task: string | undefined) => void;
}

const DEMO_AGENTS: Agent[] = [];
const DEMO_TEAMS: Team[] = [];

export const useClawStore = create<ClawState>((set, get) => ({
  agents: DEMO_AGENTS,
  teams: DEMO_TEAMS,
  connected: false,
  panes: [],
  activePaneId: null,
  sidebarExpanded: { agents: true, teams: true, active: true },
  notifications: [],
  showNotifications: false,
  modalOpen: false,
  modalTab: 'agent',

  setAgents: (agents) => set({ agents }),
  setTeams: (teams) => set({ teams }),
  setConnected: (connected) => set({ connected }),
  
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  
  addTeam: (team) => set((state) => ({ teams: [...state.teams, team] })),
  
  openPane: (agentId) => {
    const existing = get().panes.find(p => p.agentId === agentId);
    if (existing) {
      set({ activePaneId: existing.id });
      return;
    }
    const newPane: ChatPane = {
      id: `pane-${Date.now()}`,
      agentId,
      messages: [],
      hasNewMessage: false,
      input: '',
    };
    set((state) => ({
      panes: [...state.panes, newPane],
      activePaneId: newPane.id,
    }));
  },
  
  closePane: (paneId) => set((state) => {
    const newPanes = state.panes.filter(p => p.id !== paneId);
    return {
      panes: newPanes,
      activePaneId: state.activePaneId === paneId 
        ? (newPanes.length > 0 ? newPanes[newPanes.length - 1].id : null)
        : state.activePaneId,
    };
  }),
  
  setActivePane: (paneId) => set({ activePaneId: paneId }),
  
  updatePaneInput: (paneId, input) => set((state) => ({
    panes: state.panes.map(p => p.id === paneId ? { ...p, input } : p),
  })),
  
  addMessage: (paneId, message) => set((state) => ({
    panes: state.panes.map(p => 
      p.id === paneId 
        ? { ...p, messages: [...p.messages, message], hasNewMessage: message.role === 'agent' }
        : p
    ),
  })),
  
  markPaneRead: (paneId) => set((state) => ({
    panes: state.panes.map(p => p.id === paneId ? { ...p, hasNewMessage: false } : p),
  })),
  
  toggleSidebar: (section) => set((state) => ({
    sidebarExpanded: { ...state.sidebarExpanded, [section]: !state.sidebarExpanded[section] },
  })),
  
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
  })),
  
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
  })),
  
  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),
  
  setShowNotifications: (show) => set({ showNotifications: show }),
  
  openModal: (tab = 'agent') => set({ modalOpen: true, modalTab: tab }),
  
  closeModal: () => set({ modalOpen: false }),
  
  setModalTab: (tab) => set({ modalTab: tab }),
  
  updateAgentTask: (agentId, task) => set((state) => ({
    agents: state.agents.map(a => 
      a.id === agentId 
        ? { ...a, currentTask: task, status: task ? 'working' : 'idle' }
        : a
    ),
  })),
}));
