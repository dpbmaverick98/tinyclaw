"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChatStore } from "@/lib/chat-store";
import { subscribeToEvents, type AgentConfig, type EventData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Activity,
  Zap,
  FileText,
  AlertCircle
} from "lucide-react";

interface AgentInsight {
  id: string;
  agent: AgentConfig;
  status: "idle" | "working" | "error";
  currentTask?: string;
  lastActivity: string;
  lastActivityTime: number;
  messagesSent: number;
  tasksCompleted: number;
  recentEvents: {
    type: string;
    message: string;
    timestamp: number;
  }[];
}

interface AgentInsightsProps {
  agents: Record<string, AgentConfig>;
}

export function AgentInsights({ agents }: AgentInsightsProps) {
  const [insights, setInsights] = useState<Record<string, AgentInsight>>({});
  const threads = useChatStore((state) => state.threads);

  // Initialize insights from agents
  useEffect(() => {
    const initial: Record<string, AgentInsight> = {};
    for (const [id, agent] of Object.entries(agents)) {
      const thread = threads[id];
      initial[id] = {
        id,
        agent,
        status: "idle",
        lastActivity: "No recent activity",
        lastActivityTime: thread?.lastMessageAt || Date.now(),
        messagesSent: thread?.messages.filter(m => m.role === "agent").length || 0,
        tasksCompleted: 0,
        recentEvents: [],
      };
    }
    setInsights(initial);
  }, [agents, threads]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsub = subscribeToEvents(
      (event: EventData) => {
        const e = event as Record<string, unknown>;
        const agentId = e.agentId as string;
        
        if (!agentId || !agents[agentId]) return;

        setInsights((prev) => {
          const insight = prev[agentId];
          if (!insight) return prev;

          const newEvent = {
            type: event.type,
            message: getEventMessage(event),
            timestamp: event.timestamp,
          };

          const recentEvents = [newEvent, ...insight.recentEvents].slice(0, 5);

          let status: "idle" | "working" | "error" = insight.status;
          let currentTask = insight.currentTask;
          let tasksCompleted = insight.tasksCompleted;
          let messagesSent = insight.messagesSent;

          switch (event.type) {
            case "chain_step_start":
              status = "working";
              currentTask = e.message as string || "Processing...";
              break;
            case "chain_step_done":
            case "response_ready":
              status = "idle";
              currentTask = undefined;
              messagesSent++;
              break;
            case "error":
              status = "error";
              break;
          }

          return {
            ...prev,
            [agentId]: {
              ...insight,
              status,
              currentTask,
              messagesSent,
              tasksCompleted,
              lastActivity: newEvent.message,
              lastActivityTime: event.timestamp,
              recentEvents,
            },
          };
        });
      },
      () => {}
    );

    return unsub;
  }, [agents]);

  const agentList = Object.entries(insights).sort((a, b) => 
    b[1].lastActivityTime - a[1].lastActivityTime
  );

  if (agentList.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium">No agents configured</h3>
          <p className="text-sm text-muted-foreground">Create agents to see their activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {agentList.map(([id, insight]) => (
        <AgentInsightCard key={id} insight={insight} />
      ))}
    </div>
  );
}

function AgentInsightCard({ insight }: { insight: AgentInsight }) {
  const statusColors = {
    idle: "bg-green-500",
    working: "bg-blue-500 animate-pulse",
    error: "bg-red-500",
  };

  const statusLabels = {
    idle: "Idle",
    working: "Working",
    error: "Error",
  };

  return (
    <Link href={`/chat/agent/${insight.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-secondary">
                  {insight.agent.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${statusColors[insight.status]}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{insight.agent.name}</span>
                  <Badge variant={insight.status === "working" ? "default" : "secondary"} className="text-xs">
                    {statusLabels[insight.status]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{insight.agent.provider}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="text-sm text-muted-foreground">
                @{insight.id} • {insight.agent.model}
              </p>

              {insight.currentTask && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-primary">{insight.currentTask}</span>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {insight.messagesSent} messages
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {insight.tasksCompleted} tasks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(insight.lastActivityTime)}
                </span>
              </div>

              {insight.recentEvents.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recent activity:</p>
                  {insight.recentEvents.slice(0, 3).map((event, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <EventIcon type={event.type} />
                      <span className="truncate">{event.message}</span>
                      <span className="text-muted-foreground">{formatTimeAgo(event.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "message_received":
      return <MessageSquare className="h-3 w-3 text-blue-500" />;
    case "response_ready":
    case "chain_step_done":
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case "chain_step_start":
      return <Zap className="h-3 w-3 text-yellow-500" />;
    case "error":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Activity className="h-3 w-3 text-muted-foreground" />;
  }
}

function getEventMessage(event: EventData): string {
  const e = event as Record<string, unknown>;
  switch (event.type) {
    case "message_received":
      return `Received: ${(e.message as string)?.slice(0, 30)}...`;
    case "response_ready":
      return `Sent response (${e.responseLength} chars)`;
    case "chain_step_start":
      return `Started: ${e.message as string || "Processing"}`;
    case "chain_step_done":
      return "Completed task";
    case "agent_routed":
      return "Routed to agent";
    default:
      return event.type.replace(/_/g, " ");
  }
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
