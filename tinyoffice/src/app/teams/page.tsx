import { getAgents, getTeams } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, MessageSquare, Pencil, Trash2, Crown } from "lucide-react";
import Link from "next/link";

export default async function TeamsPage() {
  const [agents, teams] = await Promise.all([
    getAgents().catch(() => ({} as Record<string, { name: string }>)),
    getTeams().catch(() => ({} as Record<string, { name: string; agents: string[]; leader_agent: string }>)),
  ]);

  const teamList = Object.entries(teams);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground">
            {teamList.length} team{teamList.length === 1 ? "" : "s"} configured
          </p>
        </div>
        <Link href="/teams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {teamList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-medium">No teams configured</h3>
              <p className="text-sm text-muted-foreground">Create your first team to get started</p>
              <Link href="/teams/new">
                <Button className="mt-4">Create team</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {teamList.map(([id, team]) => {
                const leader = agents[team.leader_agent];
                return (
                  <div
                    key={id}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-accent"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary">
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{team.name}</span>
                        <Badge variant="secondary">{team.agents.length} agents</Badge>
                        {leader && (
                          <Badge variant="outline" className="gap-1">
                            <Crown className="h-3 w-3" />
                            {leader.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{id}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link href={`/chat/team/${id}`}>
                        <Button variant="ghost" size="icon">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/teams/${id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
