import { Agent, Team, QueueStatus, SSEEvent } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3777';

export async function fetchAgents(): Promise<Record<string, Agent['config']>> {
  const res = await fetch(`${API_BASE}/api/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function fetchTeams(): Promise<Record<string, Team['config']>> {
  const res = await fetch(`${API_BASE}/api/teams`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function fetchQueueStatus(): Promise<QueueStatus> {
  const res = await fetch(`${API_BASE}/api/queue/status`);
  if (!res.ok) throw new Error('Failed to fetch queue status');
  return res.json();
}

export async function createAgent(id: string, config: Agent['config']): Promise<{ ok: boolean; agent: Agent['config'] }> {
  const res = await fetch(`${API_BASE}/api/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to create agent');
  return res.json();
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/agents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete agent');
}

export async function sendMessage(message: string, agentId?: string): Promise<{ ok: boolean; messageId: string }> {
  const res = await fetch(`${API_BASE}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      agent: agentId,
      channel: 'clawbase',
      sender: 'User',
    }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export function createSSEConnection(onEvent: (event: SSEEvent) => void): EventSource {
  const es = new EventSource(`${API_BASE}/api/events/stream`);
  
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error('Failed to parse SSE event:', err);
    }
  };

  es.onerror = (err) => {
    console.error('SSE error:', err);
  };

  return es;
}
