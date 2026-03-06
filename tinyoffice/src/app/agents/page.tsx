import { getAgents, getTeams } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Plus, Search, MessageSquare, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage() {
  const agents = await getAgents().catch(() =>
    ({} as Record<string, { name: string; provider: string; model: string }>)
  );

  const agentList = Object.entries(agents);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            {agentList.length} agent{agentList.length === 1 ? "" : "s"} configured
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {agentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-medium">No agents configured</h3>
              <p className="text-sm text-muted-foreground">Create your first agent to get started</p>
              <Link href="/agents/new">
                <Button className="mt-4">Create agent</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {agentList.map(([id, agent]) => (
                <div
                  key={id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-accent"
003e
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.name}</span>
                      <Badge variant="secondary">{agent.provider}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{id} • {agent.model}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link href={`/chat/agent/${id}`}>
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/agents/${id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
