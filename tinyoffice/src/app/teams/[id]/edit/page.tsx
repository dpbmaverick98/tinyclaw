"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getTeams, getAgents, saveTeam, type TeamConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Loader2, Check, Bot, Crown } from "lucide-react";
import Link from "next/link";
import { type AgentConfig } from "@/lib/api";

export default function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<Record<string, AgentConfig>>({});
  
  const [form, setForm] = useState({
    name: "",
    leader_agent: "",
    selectedAgents: [] as string[],
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsData, agentsData] = await Promise.all([
          getTeams(),
          getAgents(),
        ]);
        
        const team = teamsData[teamId];
        if (!team) {
          setError("Team not found");
          setLoading(false);
          return;
        }
        
        setAgents(agentsData);
        setForm({
          name: team.name,
          leader_agent: team.leader_agent,
          selectedAgents: team.agents,
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [teamId]);

  const setField = (field: keyof typeof form, value: string | string[]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  };

  const toggleAgent = (agentId: string) => {
    setForm((f) => {
      const selected = f.selectedAgents.includes(agentId)
        ? f.selectedAgents.filter((id) => id !== agentId)
        : [...f.selectedAgents, agentId];
      
      // If removing leader, clear leader
      const newLeader = agentId === f.leader_agent && !selected.includes(agentId) 
        ? "" 
        : f.leader_agent;
      
      return { ...f, selectedAgents: selected, leader_agent: newLeader };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (form.selectedAgents.length === 0) {
      setError("Select at least one agent");
      return;
    }
    if (!form.leader_agent) {
      setError("Select a team leader");
      return;
    }
    
    setSaving(true);
    setError("");
    
    try {
      const teamConfig: TeamConfig = {
        name: form.name.trim(),
        agents: form.selectedAgents,
        leader_agent: form.leader_agent,
      };
      
      await saveTeam(teamId, teamConfig);
      router.push("/teams");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  const agentEntries = Object.entries(agents);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/teams">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Edit Team</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Editing @{teamId}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-[var(--accent-blue)]" />
            Team Configuration
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Team ID</label>
                <Input
                  value={teamId}
                  disabled
                  className="font-mono opacity-50"
                />
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  ID cannot be changed</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Display Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Backend Team"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Team Leader *</label>
              <select
                value={form.leader_agent}
                onChange={(e) => setField("leader_agent", e.target.value)}
                className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
              >
                <option value="">Select leader...</option>
                {form.selectedAgents.map((agentId) => {
                  const agent = agents?.[agentId];
                  return (
                    <option key={agentId} value={agentId}>
                      {agent?.name || agentId} (@{agentId})
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Select Agents *</label>
              
              <div className="space-y-1 rounded-md border border-[var(--border)] p-2">
                {agentEntries.map(([id, agent]) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--surface-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={form.selectedAgents.includes(id)}
                      onChange={() => toggleAgent(id)}
                      className="rounded border-[var(--border)]"
                    />
                    <Bot className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                    <span className="flex-1 text-sm text-[var(--text-primary)]">{agent.name}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">@{id}</span>
                    {form.leader_agent === id && (
                      <Crown className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-[var(--accent-red)]">{error}</p>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Link href="/teams">
                <Button type="button" variant="secondary" disabled={saving}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
