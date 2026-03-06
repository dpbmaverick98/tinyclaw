"use client";

import { useState, useEffect, useRef } from "react";
import { usePolling } from "@/lib/hooks";
import { timeAgo } from "@/lib/hooks";
import { getAgents, getTeams, subscribeToEvents, type AgentConfig, type TeamConfig, type EventData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Bot, Users, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "agent_start" | "agent_complete" | "message" | "status_change";
  agentId?: string;
  agentName?: string;
  teamId?: string;
  teamName?: string;
  message?: string;
  timestamp: number;
  detail?: string;
}

export default function ActivityPage() {
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [connected, setConnected] = useState(false);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const unsub = subscribeToEvents(
      (event: EventData) => {
        setConnected(true);
        
        const fp = `${event.type}:${event.timestamp}`;
        if (seenRef.current.has(fp)) return;
        seenRef.current.add(fp);
        
        // Keep set size bounded
        if (seenRef.current.size > 500) {
          const entries = [...seenRef.current];
          seenRef.current = new Set(entries.slice(-300));
        }

        const e = event as Record<string, unknown>;
        
        // Convert events to activity items
        let activity: ActivityItem | null = null;
        
        if (event.type === "chain_step_start") {
          activity = {
            id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            type: "agent_start",
            agentId: e.agentId as string,
            agentName: agents?.[e.agentId as string]?.name,
            timestamp: event.timestamp,
            detail: e.message as string,
          };
        } else if (event.type === "chain_step_done" || event.type === "response_ready") {
          activity = {
            id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            type: "agent_complete",
            agentId: e.agentId as string,
            agentName: agents?.[e.agentId as string]?.name,
            timestamp: event.timestamp,
            detail: `${e.responseLength || 0} chars`,
          };
        } else if (event.type === "message_received") {
          activity = {
            id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            type: "message",
            timestamp: event.timestamp,
            message: e.message as string,
            detail: `from ${e.sender}`,
          };
        } else if (event.type === "agent_routed" || event.type === "chain_handoff") {
          activity = {
            id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            type: "status_change",
            agentId: e.agentId as string,
            agentName: agents?.[e.agentId as string]?.name,
            timestamp: event.timestamp,
            detail: event.type === "agent_routed" ? "Routed to agent" : "Handoff",
          };
        }

        if (activity) {
          setActivities((prev) => [activity!, ...prev].slice(0, 100));
        }
      },
      () => setConnected(false)
    );

    return unsub;
  }, [agents, teams]);

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityItem[]>);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Activity</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Live feed of agent actions and events</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-[var(--accent-green)] animate-pulse-dot" : "bg-[var(--accent-red)]"}`} />
          <span className="text-xs text-[var(--text-tertiary)]">
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-[var(--accent-blue)]" />
            Event Feed
          </CardTitle>
        </CardHeader>        
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-[var(--text-tertiary)]" />
              <p className="mt-4 text-sm text-[var(--text-secondary)]">No activity yet</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Send a message to see agent actions in real-time
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, items]) => (
                <div key={date}>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                    {date === new Date().toLocaleDateString() ? "Today" : date}
                  </h3>
                  
                  <div className="space-y-2">
                    {items.map((activity) => (
                      <ActivityRow 
                        key={activity.id} 
                        activity={activity} 
                        agents={agents || {}}
                        teams={teams || {}}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({
  activity,
  agents,
  teams,
}: {
  activity: ActivityItem;
  agents: Record<string, AgentConfig>;
  teams: Record<string, TeamConfig>;
}) {
  const getIcon = () => {
    switch (activity.type) {
      case "agent_start":
        return <Bot className="h-3.5 w-3.5 text-yellow-500" />;
      case "agent_complete":
        return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-green)]" />;
      case "message":
        return <MessageSquare className="h-3.5 w-3.5 text-[var(--accent-blue)]" />;
      case "status_change":
        return <ArrowRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />;
    }
  };

  const getContent = () => {
    switch (activity.type) {
      case "agent_start":
        return (
          <>
            <span className="font-medium text-[var(--text-primary)]">
              {activity.agentName || activity.agentId}
            </span>
            <span className="text-[var(--text-secondary)]"> started working</span>
            {activity.detail && (
              <span className="text-[var(--text-tertiary)]">: {activity.detail.slice(0, 50)}...</span>
            )}
          </>
        );
      case "agent_complete":
        return (
          <>
            <span className="font-medium text-[var(--text-primary)]">
              {activity.agentName || activity.agentId}
            </span>
            <span className="text-[var(--text-secondary)]"> completed task</span>
            {activity.detail && (
              <Badge variant="outline" className="ml-2 text-[10px]">{activity.detail}</Badge>
            )}
          </>
        );
      case "message":
        return (
          <>
            <span className="text-[var(--text-secondary)]">New message</span>
            {activity.detail && (
              <span className="text-[var(--text-tertiary)]"> {activity.detail}</span>
            )}
            {activity.message && (
              <span className="text-[var(--text-tertiary)]">: {activity.message.slice(0, 60)}...</span>
            )}
          </>
        );
      case "status_change":
        return (
          <>
            <span className="text-[var(--text-secondary)]">{activity.detail}</span>
            {activity.agentId && (
              <span className="font-medium text-[var(--text-primary)]"> @{activity.agentId}</span>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start gap-3 py-2 animate-slide-up">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0 text-sm">{getContent()}</div>
      <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
        {timeAgo(activity.timestamp)}
      </span>
    </div>
  );
}
