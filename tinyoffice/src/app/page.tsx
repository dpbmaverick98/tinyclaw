"use client";

import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import {
  Bot,
  Users,
  Inbox,
  Cpu,
  Send,
  MessageSquare,
  Activity,
  ArrowRight,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const { data: queue } = usePolling<QueueStatus>(getQueueStatus, 2000);
  const { events } = useSSE(20);
  const totalUnread = useChatStore((state) => state.getTotalUnreadCount());

  const agentCount = agents ? Object.keys(agents).length : 0;
  const teamCount = teams ? Object.keys(teams).length : 0;
  const onlineAgents = agentCount; // TODO: Real status

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Overview of your TinyClaw system
          </p>
        </div>
        <Link href="/chat">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          label="Unread"
          value={totalUnread}
          sub={totalUnread === 1 ? "unread message" : "unread messages"}
          href="/inbox"
          accent={totalUnread > 0}
        />
        <StatCard
          icon={Cpu}
          label="Processing"
          value={queue?.processing ?? 0}
          sub="in progress"
          href="/activity"
          accent={(queue?.processing ?? 0) > 0}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid flex-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--accent-blue)]" />
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </div>
            <Link href="/activity">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          
          <CardContent className="flex-1">
            {events.length > 0 ? (
              <div className="space-y-1">
                {events.slice(0, 8).map((event, i) => (
                  <ActivityRow key={`${event.timestamp}-${i}`} event={event} />
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <p className="text-sm text-[var(--text-tertiary)]">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <div className="space-y-4">
          {/* Agents Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[var(--accent-blue)]" />
                  <CardTitle className="text-sm font-medium">Agents</CardTitle>
                </div>
                <Link href="/agents">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Manage
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            
            <CardContent>
              {agents && Object.keys(agents).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(agents).slice(0, 5).map(([id, agent]) => (
                    <Link
                      key={id}
                      href={`/chat/agent/${id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-hover)]"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface-hover)] text-[10px] font-medium">
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm text-[var(--text-primary)]">{agent.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {agent.provider}
                      </Badge>
                    </Link>
                  ))}
                  {Object.keys(agents).length > 5 && (
                    <p className="px-2 text-xs text-[var(--text-tertiary)]">
                      +{Object.keys(agents).length - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">No agents configured</p>
              )}
            </CardContent>
          </Card>

          {/* Teams Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--accent-blue)]" />
                  <CardTitle className="text-sm font-medium">Teams</CardTitle>
                </div>
                <Link href="/teams">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Manage
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            
            <CardContent>
              {teams && Object.keys(teams).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(teams).slice(0, 5).map(([id, team]) => (
                    <Link
                      key={id}
                      href={`/chat/team/${id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-hover)]"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface-hover)]">
                        <Users className="h-3 w-3 text-[var(--text-secondary)]" />
                      </div>
                      <span className="flex-1 text-sm text-[var(--text-primary)]">{team.name}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {team.agents.length} agents
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">No teams configured</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={cn(
        "transition-colors hover:border-[var(--border-hover)]",
        accent && "border-[var(--accent-blue)]/30"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              accent ? "bg-[var(--accent-blue)]/10" : "bg-[var(--surface-hover)]"
            )}>
              <Icon className={cn("h-4 w-4", accent ? "text-[var(--accent-blue)]" : "text-[var(--text-secondary)]")} />
            </div>
            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              {label}
            </span>
          </div>
          
          <div className="mt-2">
            <span className={cn(
              "text-2xl font-semibold",
              accent ? "text-[var(--accent-blue)]" : "text-[var(--text-primary)]"
            )}>
              {value}
            </span>
            <p className="text-xs text-[var(--text-tertiary)]">{sub}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityRow({ event }: { event: EventData }) {
  const e = event as Record<string, unknown>;
  
  const config: Record<string, { color: string; label: string }> = {
    message_received: { color: "bg-blue-500", label: "Message" },
    agent_routed: { color: "bg-[var(--accent-blue)]", label: "Routed" },
    chain_step_start: { color: "bg-yellow-500", label: "Started" },
    chain_step_done: { color: "bg-green-500", label: "Done" },
    response_ready: { color: "bg-green-400", label: "Response" },
    team_chain_start: { color: "bg-purple-500", label: "Team" },
    team_chain_end: { color: "bg-purple-400", label: "Team Done" },
  };
  
  const { color, label } = config[event.type] || { color: "bg-[var(--text-tertiary)]", label: event.type };
  
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--surface-hover)]">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate">
          {label}
          {e.agentId && <span className="text-[var(--text-secondary)]"> @{String(e.agentId)}</span>}
        </p>
      </div>
      
      <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
        {timeAgo(event.timestamp)}
      </span>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
