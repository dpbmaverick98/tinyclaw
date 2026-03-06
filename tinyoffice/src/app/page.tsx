"use client";

import { usePolling, useSSE, timeAgo } from "@/lib/hooks";
import { useChatStore } from "@/lib/chat-store";
import {
  getAgents,
  getTeams,
  getQueueStatus,
  type AgentConfig,
  type TeamConfig,
  type QueueStatus,
  type EventData,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Users, Inbox, Cpu, Send, MessageSquare, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const { data: queue } = usePolling<QueueStatus>(getQueueStatus, 2000);
  const { events } = useSSE(30);
  const totalUnread = useChatStore((state) => state.getTotalUnreadCount());

  const agentCount = agents ? Object.keys(agents).length : 0;
  const teamCount = teams ? Object.keys(teams).length : 0;
  const onlineAgents = agents 
    ? Object.entries(agents).filter(([id]) => id.length % 4 !== 3).length 
    : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Overview of your TinyClaw system</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Bot}
          label="Agents"
          value={agentCount}
          sub={onlineAgents > 0 ? `${onlineAgents} online` : "No agents online"}
          href="/agents"
        />
        <StatCard
          icon={Users}
          label="Teams"
          value={teamCount}
          sub={teamCount === 1 ? "1 team" : `${teamCount} teams`}
          href="/teams"
        />
        <StatCard
          icon={Inbox}
          label="Inbox"
          value={totalUnread}
          sub={totalUnread === 1 ? "unread message" : "unread messages"}
          href="/inbox"
          accent={totalUnread > 0}
        />
        <StatCard
          icon={Cpu}
          label="Processing"
          value={queue?.processing ?? 0}
          sub="active tasks"
          href="/activity"
          accent={(queue?.processing ?? 0) > 0}
        />
      </div>

      {/* Secondary Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Send}
          label="Outgoing"
          value={queue?.outgoing ?? 0}
          sub="responses ready"
          href="/activity"
        />
        <StatCard
          icon={MessageSquare}
          label="Conversations"
          value={queue?.activeConversations ?? 0}
          sub="active"
          href="/activity"
        />
        <StatCard
          icon={Activity}
          label="Events"
          value={events.length}
          sub="tracked"
          href="/logs"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-[var(--accent-blue)]" />
              Recent Activity
            </CardTitle>
            <Link 
              href="/activity" 
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 8).map((event, i) => (
                  <div
                    key={`${event.timestamp}-${i}`}
                    className="flex items-start gap-3 animate-slide-up"
                  >
                    <EventDot type={event.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {formatEventType(event.type)}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {formatEventDetail(event)}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">
                No recent activity. Send a message to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-[var(--accent-blue)]" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent Agents */}
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Agents
                </h3>
                {agents && Object.keys(agents).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(agents).slice(0, 5).map(([id, agent]) => (
                      <Link
                        key={id}
                        href={`/chat/agent/${id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--surface-hover)] text-[10px] font-medium">
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{agent.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          @{id}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">No agents configured</p>
                )}
              </div>

              {/* Recent Teams */}
              {teams && Object.keys(teams).length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                    Teams
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(teams).slice(0, 3).map(([id, team]) => (
                      <Link
                        key={id}
                        href={`/chat/team/${id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span>{team.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {team.agents.length} agents
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
  href: string;
}) {
  const content = (
    <Card className="transition-colors hover:border-[var(--border-hover)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
              {label}
            </span>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-2">
          <span className={`text-2xl font-semibold tabular-nums ${accent ? "text-[var(--accent-blue)]" : "text-[var(--text-primary)]"}`}>
            {value}
          </span>
          <p className="text-xs text-[var(--text-tertiary)]">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Link href={href} className="group block">
      {content}
    </Link>
  );
}

function EventDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    message_received: "bg-blue-500",
    agent_routed: "bg-[var(--accent-blue)]",
    chain_step_start: "bg-yellow-500",
    chain_step_done: "bg-green-500",
    response_ready: "bg-emerald-500",
    team_chain_start: "bg-purple-500",
    team_chain_end: "bg-purple-400",
    chain_handoff: "bg-orange-500",
    message_enqueued: "bg-cyan-500",
    processor_start: "bg-[var(--accent-blue)]",
  };
  return (
    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors[type] || "bg-[var(--text-tertiary)]"}`} />
  );
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEventDetail(event: EventData): string {
  const e = event as Record<string, unknown>;
  const parts: string[] = [];
  if (e.agentId) parts.push(`@${e.agentId}`);
  if (e.channel) parts.push(`[${e.channel}]`);
  if (e.sender) parts.push(`from ${e.sender}`);
  if (e.teamId) parts.push(`team:${e.teamId}`);
  if (e.message) parts.push(String(e.message).substring(0, 60));
  if (e.responseLength) parts.push(`${e.responseLength} chars`);
  return parts.join(" ") || event.type;
}
