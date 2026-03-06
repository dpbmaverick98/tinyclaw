"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSSE, timeAgo } from "@/lib/hooks";
import { usePolling } from "@/lib/hooks";
import { getAgents, getTeams, type AgentConfig, type TeamConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight,
  Activity,
  Clock,
  Zap
} from "lucide-react";

// Event type icons and colors
const EVENT_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  message_received: { icon: MessageSquare, color: "text-blue-400", label: "Message" },
  agent_routed: { icon: Bot, color: "text-[var(--accent-blue)]", label: "Routed" },
  chain_step_start: { icon: Zap, color: "text-yellow-400", label: "Started" },
  chain_step_done: { icon: CheckCircle2, color: "text-green-400", label: "Completed" },
  chain_handoff: { icon: ArrowRight, color: "text-orange-400", label: "Handoff" },
  team_chain_start: { icon: Users, color: "text-purple-400", label: "Team Start" },
  team_chain_end: { icon: CheckCircle2, color: "text-purple-300", label: "Team Done" },
  response_ready: { icon: MessageSquare, color: "text-green-400", label: "Response" },
  processor_start: { icon: Zap, color: "text-[var(--accent-blue)]", label: "Processor" },
  message_enqueued: { icon: Clock, color: "text-cyan-400", label: "Queued" },
};

interface ActivityEvent {
  id: string;
  type: string;
  timestamp: number;
  agentId?: string;
  agentName?: string;
  teamId?: string;
  message?: string;
  responseText?: string;
  channel?: string;
  sender?: string;
}

export default function ActivityPage() {
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const { events: sseEvents } = useSSE(50);
  
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  
  // Process SSE events into activities
  useEffect(() => {
    const newActivities: ActivityEvent[] = [];
    
    for (const event of sseEvents) {
      const e = event as Record<string, unknown>;
      const fp = `${event.type}:${event.timestamp}:${e.agentId || ""}:${e.messageId || ""}`;
      
      if (seenRef.current.has(fp)) continue;
      seenRef.current.add(fp);
      
      // Keep set size manageable
      if (seenRef.current.size > 200) {
        const entries = [...seenRef.current];
        seenRef.current = new Set(entries.slice(-100));
      }
      
      newActivities.push({
        id: fp,
        type: event.type,
        timestamp: event.timestamp,
        agentId: e.agentId as string,
        agentName: e.agentName as string,
        teamId: e.teamId as string,
        message: e.message as string,
        responseText: e.responseText as string,
        channel: e.channel as string,
        sender: e.sender as string,
      });
    }
    
    if (newActivities.length > 0) {
      setActivities((prev) => [...newActivities, ...prev].slice(0, 100));
    }
  }, [sseEvents]);
  
  const agentCount = agents ? Object.keys(agents).length : 0;
  const teamCount = teams ? Object.keys(teams).length : 0;
  
  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityEvent[]>);
  
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Activity</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Real-time feed of agent actions and events
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {agentCount} agent{agentCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {teamCount} team{teamCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
      
      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activities.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Activity className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">No activity yet</p>
            <p className="text-xs text-[var(--text-tertiary)]">Events will appear here as agents process messages</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 bg-[var(--background)] py-1">
                  <span className="text-xs font-medium text-[var(--text-tertiary)]">
                    {date === new Date().toLocaleDateString() ? "Today" : date}
                  </span>
                  <div className="flex-1 border-t border-[var(--border)]" />
                </div>
                
                <div className="space-y-1">
                  {dateActivities.map((activity) => (
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
      </div>
    </div>
  );
}

function ActivityRow({ 
  activity, 
  agents, 
  teams 
}: { 
  activity: ActivityEvent; 
  agents: Record<string, AgentConfig>;
  teams: Record<string, TeamConfig>;
}) {
  const config = EVENT_CONFIG[activity.type] || { 
    icon: Activity, 
    color: "text-[var(--text-tertiary)]", 
    label: activity.type 
  };
  
  const Icon = config.icon;
  const agentName = activity.agentId ? agents[activity.agentId]?.name || activity.agentId : null;
  const teamName = activity.teamId ? teams[activity.teamId]?.name || activity.teamId : null;
  
  return (
    <div className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-[var(--surface)]">
      <div className={cn("mt-0.5", config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {config.label}
          </span>
          
          {agentName && (
            <Badge variant="secondary" className="text-[10px]">
              @{activity.agentId}
            </Badge>
          )}
          
          {teamName && (
            <Badge variant="outline" className="text-[10px]">
              team:{activity.teamId}
            </Badge>
          )}
        </div>
        
        {activity.message && (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)] line-clamp-2">
            {activity.message}
          </p>
        )}
        
        {activity.responseText && (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)] line-clamp-2">
            {activity.responseText}
          </p>
        )}
        
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
          <span>{timeAgo(activity.timestamp)}</span>
          {activity.channel && <span>• {activity.channel}</span>}
          {activity.sender && <span>• from {activity.sender}</span>}
        </div>
      </div>
    </div>
  );
}
