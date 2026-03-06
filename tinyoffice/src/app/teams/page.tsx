"use client";

import { useState } from "react";
import Link from "next/link";
import { usePolling } from "@/lib/hooks";
import { getTeams, getAgents, deleteTeam, type TeamConfig, type AgentConfig } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  Pencil, 
  Trash2,
  Bot,
  Crown
} from "lucide-react";

export default function TeamsPage() {
  const { data: teams, refresh } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const teamEntries = teams ? Object.entries(teams) : [];
  
  const filteredTeams = teamEntries.filter(([id, team]) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete @${id}?`)) return;
    
    setDeleting(id);
    try {
      await deleteTeam(id);
      refresh();
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Teams</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {teamEntries.length} team{teamEntries.length === 1 ? "" : "s"} configured
          </p>
        </div>        
        <Link href="/teams/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Team
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Teams List */}
      <Card>
        <CardContent className="p-0">
          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-[var(--text-tertiary)]" />
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                {searchQuery ? "No teams match your search" : "No teams configured"}
              </p>
              {!searchQuery && (
                <Link href="/teams/new">
                  <Button variant="secondary" className="mt-3" size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create your first team
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredTeams.map(([id, team]) => {
                const leader = agents?.[team.leader_agent];
                
                return (
                  <div
                    key={id}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface-hover)] border border-[var(--border)]">
                      <Users className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{team.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          @{id}
                        </Badge>
                      </div>                      
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          {team.agents.length} agents
                        </span>                        
                        {leader && (
                          <span className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Lead: {leader.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Link href={`/chat/team/${id}`}>
                        <Button variant="ghost" size="icon-sm" title="Chat">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </Link>                      
                      <Link href={`/teams/${id}/edit`}>
                        <Button variant="ghost" size="icon-sm" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>                      
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete"
                        onClick={() => handleDelete(id)}
                        disabled={deleting === id}
                        className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
                      >
                        {deleting === id ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--text-tertiary)] border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
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
