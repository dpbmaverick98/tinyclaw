"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTeam, getAgents, type TeamConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, Loader2, Bot, Crown } from "lucide-react";
import Link from "next/link";

export default function NewTeamPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<Record<string, { name: string }>>({});
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    leader_agent: "",
    selectedAgents: [] as string[],
  });

  useState(() => {
    getAgents().then(setAgents);
  });

  const agentList = Object.entries(agents);

  const toggleAgent = (agentId: string) => {
    setForm((f) => {
      const selected = f.selectedAgents.includes(agentId)
        ? f.selectedAgents.filter((id) => id !== agentId)
        : [...f.selectedAgents, agentId];
      return { ...f, selectedAgents: selected };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.id.trim() || !form.name.trim()) {
      setError("ID and name are required");
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
    if (/\s/.test(form.id)) {
      setError("ID cannot contain spaces");
      return;
    }
    
    setSaving(true);
    try {
      const team: TeamConfig = {
        name: form.name.trim(),
        agents: form.selectedAgents,
        leader_agent: form.leader_agent,
      };
      
      await saveTeam(form.id.toLowerCase(), team);
      router.push("/teams");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/teams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Team</h1>
          <p className="text-muted-foreground">Create a new agent team</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Team Configuration
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team ID *</label>
                <Input
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g. backend"
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Backend Team"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Leader *</label>
              <select
                value={form.leader_agent}
                onChange={(e) => setForm({ ...form, leader_agent: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3"
              >
                <option value="">Select leader...</option>
                {form.selectedAgents.map((agentId) => (
                  <option key={agentId} value={agentId}>
                    {agents[agentId]?.name || agentId}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Agents *</label>
              <div className="rounded-md border p-2 space-y-1">
                {agentList.map(([id, agent]) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 rounded p-2 hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={form.selectedAgents.includes(id)}
                      onCheckedChange={() => toggleAgent(id)}
                    />
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{agent.name}</span>
                    <span className="text-xs text-muted-foreground">@{id}</span>
                    {form.leader_agent === id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Team
              </Button>
              <Link href="/teams">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
