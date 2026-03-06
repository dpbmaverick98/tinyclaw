import { getAgents, getTeams } from "@/lib/api";
import { ChatInterface } from "@/components/chat-interface";

export default async function ChatPageWrapper({
  params,
}: {
  params: Promise<{ agent?: string; team?: string }>;
}) {
  const [agents, teams] = await Promise.all([
    getAgents().catch(() => ({} as Record<string, { name: string; provider: string; model: string }>)),
    getTeams().catch(() => ({} as Record<string, { name: string; agents: string[] }>)),
  ]);

  return <ChatInterface agents={agents} teams={teams} />;
}
