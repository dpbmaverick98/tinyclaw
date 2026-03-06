import Link from "next/link";
import { getAgents, getTeams, getQueueStatus } from "@/lib/api";
import { AgentInsights } from "@/components/agent-insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Users, Cpu, Activity, ArrowRight, MessageSquare } from "lucide-react";

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
        <p className="text-muted-foreground">Real-time insights into your multi-agent system</p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agent Insights - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agent Insights
            </CardTitle>
            <Link href="/agents">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <AgentInsights agents={agents} />
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusItem
              label="Queue Processor"
              status="online"
              detail="Active"
            />
            <StatusItem
              label="Incoming Messages"
              status={queue.incoming > 0 ? "warning" : "online"}
              detail={`${queue.incoming} pending`}
            />
            <StatusItem
              label="Outgoing Responses"
              status={queue.outgoing > 0 ? "warning" : "online"}
              detail={`${queue.outgoing} ready`}
            />
            <StatusItem
              label="Active Conversations"
              status={queue.activeConversations > 0 ? "active" : "online"}
              detail={`${queue.activeConversations} ongoing`}
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

function StatusItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: "online" | "warning" | "active" | "error";
  detail: string;
}) {
  const statusColors = {
    online: "bg-green-500",
    warning: "bg-yellow-500",
    active: "bg-blue-500 animate-pulse",
    error: "bg-red-500",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm">{label}</span>
      </div>
      <Badge variant="secondary" className="text-xs">{detail}</Badge>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
