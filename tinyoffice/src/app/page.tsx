import Link from "next/link";
import { getAgents, getTeams, getQueueStatus } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Users, Inbox, Cpu, Activity, ArrowRight, MessageSquare } from "lucide-react";

export default async function DashboardPage() {
  const [agents, teams, queue] = await Promise.all([
    getAgents().catch(() => ({} as Record<string, { name: string; provider: string; model: string }>)),
    getTeams().catch(() => ({} as Record<string, { name: string; agents: string[] }>)),
    getQueueStatus().catch(() => ({ incoming: 0, processing: 0, outgoing: 0, activeConversations: 0 })),
  ]);

  const agentList = Object.entries(agents);
  const teamList = Object.entries(teams);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your multi-agent system</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Agents"
          value={agentList.length}
          subtitle={`${agentList.length} configured`}
          icon={Bot}
          href="/agents"
        />
        <StatCard
          title="Teams"
          value={teamList.length}
          subtitle={`${teamList.length} active`}
          icon={Users}
          href="/teams"
        />
        <StatCard
          title="Processing"
          value={queue.processing}
          subtitle="active tasks"
          icon={Cpu}
          href="/activity"
          highlight={queue.processing > 0}
        />
        <StatCard
          title="Conversations"
          value={queue.activeConversations}
          subtitle="active chats"
          icon={MessageSquare}
          href="/inbox"
          highlight={queue.activeConversations > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Agent Status
            </CardTitle>
            <Link href="/agents">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {agentList.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No agents configured"
                description="Create your first agent to get started"
                action={{ href: "/agents/new", label: "Create agent" }}
              />
            ) : (
              <div className="space-y-3">
                {agentList.slice(0, 5).map(([id, agent]) => (
                  <AgentRow key={id} id={id} agent={agent} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Live Activity
            </CardTitle>
            <Link href="/activity">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="Activity feed"
              description="Real-time agent actions will appear here"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  highlight,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
          </div>
          <div className="mt-2">
            <span className={cn("text-2xl font-bold", highlight && "text-primary")}>
              {value}
            </span>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AgentRow({
  id,
  agent,
}: {
  id: string;
  agent: { name: string; provider: string; model: string };
}) {
  return (
    <Link href={`/chat/agent/${id}`}>
      <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary text-xs">
            {agent.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{agent.name}</span>
            <Badge variant="secondary" className="text-xs">
              {agent.provider}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            @{id} • {agent.model}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button className="mt-3" size="sm">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
