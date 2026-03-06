"use client";

import Link from "next/link";
import { useChatStore } from "@/lib/chat-store";
import { usePolling } from "@/lib/hooks";
import { getAgents, getTeams, type AgentConfig, type TeamConfig } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Users, MessageSquare, Inbox } from "lucide-react";

export default function InboxPage() {
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const threads = useChatStore((state) => state.threads);
  
  // Get threads with unread messages
  const unreadThreads = Object.values(threads)
    .filter((t) => t.unreadCount > 0)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  
  // Get recent threads (even if read)
  const recentThreads = Object.values(threads)
    .filter((t) => t.messages.length > 0)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .slice(0, 10);
  
  const totalUnread = Object.values(threads).reduce(
    (sum, t) => sum + t.unreadCount,
    0
  );
  
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Inbox</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {totalUnread > 0 
              ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}`
              : "No unread messages"
            }
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {unreadThreads.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Unread
            </h2>
            <div className="space-y-2">
              {unreadThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  agent={agents?.[thread.id]}
                  team={teams?.[thread.id]}
                  unread
                />
              ))}
            </div>
          </div>
        )}
        
        {recentThreads.length > 0 ? (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Recent
            </h2>
            <div className="space-y-2">
              {recentThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  agent={agents?.[thread.id]}
                  team={teams?.[thread.id]}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Inbox className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">No conversations yet</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Start chatting with an agent or team from the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadCard({
  thread,
  agent,
  team,
  unread,
}: {
  thread: ReturnType<typeof useChatStore.getState>["threads"][string];
  agent?: AgentConfig;
  team?: TeamConfig;
  unread?: boolean;
}) {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const displayName = agent?.name || team?.name || thread.name;
  const href = thread.type === "agent" 
    ? `/chat/agent/${thread.id}` 
    : `/chat/team/${thread.id}`;
  
  return (
    <Link href={href}>
      <Card className={cn(
        "transition-colors hover:border-[var(--border-hover)]",
        unread && "border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/5"
      )}>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-hover)] border border-[var(--border)]">
            {thread.type === "team" ? (
              <Users className="h-4 w-4 text-[var(--text-secondary)]" />
            ) : (
              <Bot className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
              <span className="text-xs text-[var(--text-tertiary)]">@{thread.id}</span>
              {unread && (
                <Badge className="h-4 min-w-4 px-1 text-[10px]">
                  {thread.unreadCount}
                </Badge>
              )}
            </div>
            
            {lastMessage && (
              <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                {lastMessage.role === "user" ? "You: " : ""}
                {lastMessage.content}
              </p>
            )}
          </div>
          
          {lastMessage && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(lastMessage.timestamp).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
