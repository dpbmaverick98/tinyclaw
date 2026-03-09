const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3777';

export interface AgentConfig {
  name: string;
  provider: string;
  model: string;
  working_directory?: string;
  system_prompt?: string;
  prompt_file?: string;
}

export interface TeamConfig {
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

export interface EventData {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new APIError(response.status, body.error || response.statusText);
  }

  return response.json();
}

// Agents - returns Record<id, config>
export async function getAgents(): Promise<Record<string, AgentConfig>> {
  return fetchAPI('/api/agents');
}

export async function saveAgent(
  id: string,
  agent: AgentConfig
): Promise<{ ok: boolean; agent: AgentConfig }> {
  return fetchAPI(`/api/agents/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(agent),
  });
}

export async function deleteAgent(id: string): Promise<{ ok: boolean }> {
  return fetchAPI(`/api/agents/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Teams - returns Record<id, config>
export async function getTeams(): Promise<Record<string, TeamConfig>> {
  return fetchAPI('/api/teams');
}

export async function saveTeam(
  id: string,
  team: TeamConfig
): Promise<{ ok: boolean; team: TeamConfig }> {
  return fetchAPI(`/api/teams/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(team),
  });
}

export async function deleteTeam(id: string): Promise<{ ok: boolean }> {
  return fetchAPI(`/api/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Chat - correct endpoint
export async function sendMessage(payload: {
  message: string;
  agent?: string;
  sender?: string;
  channel?: string;
}): Promise<{ ok: boolean; messageId: string }> {
  return fetchAPI('/api/message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// SSE - correct endpoint with event types
export function subscribeToEvents(
  onEvent: (event: EventData) => void,
  onError?: (err: Event) => void
): () => void {
  const es = new EventSource(`${API_BASE}/api/events/stream`);

  const handler = (e: MessageEvent) => {
    try { 
      onEvent(JSON.parse(e.data)); 
    } catch { 
      /* ignore parse errors */ 
    }
  };

  // Listen to all known event types
  const eventTypes = [
    'message_received', 'agent_routed', 'chain_step_start', 'chain_step_done',
    'chain_handoff', 'team_chain_start', 'team_chain_end', 'response_ready',
    'processor_start', 'message_enqueued',
  ];
  
  for (const type of eventTypes) {
    es.addEventListener(type, handler);
  }

  if (onError) es.onerror = onError;

  return () => es.close();
}
