"use client";

import Link from "next/link";
import { usePolling } from "@/lib/hooks";
import { useChatStore } from "@/lib/chat-store";
import { getAgents, getTeams, type AgentConfig, type TeamConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Bot, Users, ArrowUpRight, MessageSquare } from "lucide-react";

export default function InboxPage() {
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const threads = useChatStore((state) => state.threads);
  
  // Get threads with unread messages
  const unreadThreads = Object.values(threads)
    .filter((t) => t.unreadCount > 0)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  
  // Get all threads with messages (for recent)
  const recentThreads = Object.values(threads)
    .filter((t) => t.messages.length > 0)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .slice(0, 10);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Inbox</h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          {unreadThreads.length > 0 
            ? `${unreadThreads.length} unread conversation${unreadThreads.length === 1 ? "" : "s"}`
            : "No unread messages"}
        </p>
      </div>

      {/* Unread Section */}
      {unreadThreads.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            Unread
          </h2>
          
          <div className="space-y-2">
            {unreadThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                agent={agents?.[thread.id]}
                team={teams?.[thread.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-[var(--accent-blue)]" />
            Recent Conversations
          </CardTitle>
        </CardHeader>        
        <CardContent>
          {recentThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="mt-3 text-sm text-[var(--text-secondary)]">No conversations yet</p>
              <Link
                href="/chat"
                className="mt-2 text-sm text-[var(--accent-blue)] hover:underline"
              >
                Start a new chat
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentThreads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  agent={agents?.[thread.id]}
                  team={teams?.[thread.id]}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ThreadCard({
  thread,
  agent,
  team,
}: {
  thread: ReturnType<typeof useChatStore.getState>["threads"][string];
  agent?: AgentConfig;
  team?: TeamConfig;
}) {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const href = thread.type === "agent" 
    ? `/chat/agent/${thread.id}` 
    : `/chat/team/${thread.id}`;
  
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--accent-blue)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--surface-hover)]">
        {thread.type === "agent" ? (
          <Bot className="h-5 w-5 text-[var(--text-secondary)]" />
        ) : (
          <Users className="h-5 w-5 text-[var(--text-secondary)]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">
            {agent?.name || team?.name || thread.id}
          </span>
          <Badge className="bg-[var(--accent-blue)] text-white text-[10px]">
            {thread.unreadCount} new
          </Badge>
        </div>        
        {lastMessage && (
          <p className="truncate text-sm text-[var(--text-secondary)]">
            {lastMessage.role === "user" ? "You: " : ""}
            {lastMessage.content.slice(0, 100)}
          </p>
        )}
      </div>      
      <ArrowUpRight className="h-4 w-4 text-[var(--text-tertiary)]" />
    </Link>
  );
}

function ThreadRow({
  thread,
  agent,
  team,
}: {
  thread: ReturnType<typeof useChatStore.getState>["threads"][string];
  agent?: AgentConfig;
  team?: TeamConfig;
}) {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const href = thread.type === "agent" 
    ? `/chat/agent/${thread.id}` 
    : `/chat/team/${thread.id}`;
  
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--surface-hover)]">
        {thread.type === "agent" ? (
          <Bot className="h-4 w-4 text-[var(--text-tertiary)]" />
        ) : (
          <Users className="h-4 w-4 text-[var(--text-tertiary)]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--text-primary)]">
            {agent?.name || team?.name || thread.id}
          </span>          
          {thread.unreadCount > 0 && (
            <Badge className="bg-[var(--accent-blue)] text-white text-[10px]">
              {thread.unreadCount}
            </Badge>
          )}
        </div>        
        {lastMessage && (
          <p className="truncate text-sm text-[var(--text-tertiary)]">
            {lastMessage.role === "user" ? "You: " : ""}
            {lastMessage.content.slice(0, 60)}
          </p>
        )}
      </div>
    </Link>
  );
}
