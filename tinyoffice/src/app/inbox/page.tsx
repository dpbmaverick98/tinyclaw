import { getAgents, getTeams } from "@/lib/api";
import { useChatStore } from "@/lib/chat-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Inbox, Bot, Users, ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function InboxPage() {
  const [agents, teams] = await Promise.all([
    getAgents().catch(() => ({} as Record<string, { name: string }>)),
    getTeams().catch(() => ({} as Record<string, { name: string }>)),
  ]);

  return <InboxContent agents={agents} teams={teams} />;
}

function InboxContent({
  agents,
  teams,
}: {
  agents: Record<string, { name: string }>;
  teams: Record<string, { name: string }>;
}) {
  const threads = useChatStore.getState().threads;
  const unreadThreads = Object.values(threads)
    .filter((t) => t.unreadCount > 0)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-muted-foreground">
          {unreadThreads.length > 0
            ? `${unreadThreads.length} unread conversation${unreadThreads.length === 1 ? "" : "s"}`
            : "No unread messages"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unreadThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-medium">All caught up!</h3>
              <p className="text-sm text-muted-foreground">No unread messages</p>
              <Link href="/chat">
                <Button className="mt-4">Start a conversation</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {unreadThreads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  name={agents[thread.id]?.name || teams[thread.id]?.name || thread.id}
                  type={thread.type}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ThreadRow({
  thread,
  name,
  type,
}: {
  thread: { id: string; unreadCount: number; lastMessageAt: number };
  name: string;
  type: "agent" | "team";
}) {
  const href = type === "agent" ? `/chat/agent/${thread.id}` : `/chat/team/${thread.id}`;
  
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-accent">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-secondary">
            {type === "agent" ? <Bot className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            <Badge>{thread.unreadCount} new</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(thread.lastMessageAt).toLocaleString()}
          </p>
        </div>
        
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
