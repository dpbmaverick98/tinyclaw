const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3777';

export interface AgentConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  working_directory?: string;
  system_prompt?: string;
}

export interface TeamConfig {
  id: string;
  name: string;
  agents: string[];
  leader_agent?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  agentId?: string;
}

export interface ServerStatus {
  status: 'running' | 'stopped';
  agents: number;
  teams: number;
  queue_size: number;
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new APIError(response.status, error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Agents
export async function getAgents(): Promise<AgentConfig[]> {
  return fetchAPI('/api/agents');
}

export async function getAgent(id: string): Promise<AgentConfig> {
  return fetchAPI(`/api/agents/${id}`);
}

export async function createAgent(config: Omit<AgentConfig, 'id'> & { id: string }): Promise<AgentConfig> {
  return fetchAPI('/api/agents', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await fetchAPI(`/api/agents/${id}`, { method: 'DELETE' });
}

// Teams
export async function getTeams(): Promise<TeamConfig[]> {
  return fetchAPI('/api/teams');
}

export async function getTeam(id: string): Promise<TeamConfig> {
  return fetchAPI(`/api/teams/${id}`);
}

export async function createTeam(config: Omit<TeamConfig, 'id'> & { id: string }): Promise<TeamConfig> {
  return fetchAPI('/api/teams', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  await fetchAPI(`/api/teams/${id}`, { method: 'DELETE' });
}

// Chat
export async function sendMessage(agentId: string, content: string): Promise<{ messageId: string; status: string }> {
  return fetchAPI('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ agentId, message: content }),
  });
}

export async function sendMessageToTeam(teamId: string, content: string): Promise<{ messageId: string; status: string }> {
  return fetchAPI('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ teamId, message: content }),
  });
}

export async function getChatHistory(agentId: string): Promise<ChatMessage[]> {
  return fetchAPI(`/api/chat/${agentId}`);
}

// Status
export async function getStatus(): Promise<ServerStatus> {
  return fetchAPI('/api/status');
}

// SSE Events
export function createEventSource(): EventSource {
  return new EventSource(`${API_BASE}/api/events`);
}
