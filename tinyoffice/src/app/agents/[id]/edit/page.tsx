"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAgents, saveAgent, type AgentConfig } from "@/lib/api";
import { PROVIDERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    provider: "anthropic",
    model: "",
    working_directory: "",
    system_prompt: "",
  });

  useEffect(() => {
    getAgents().then((agents) => {
      const agent = agents[agentId];
      if (agent) {
        setForm({
          name: agent.name,
          provider: agent.provider,
          model: agent.model,
          working_directory: agent.working_directory || "",
          system_prompt: agent.system_prompt || "",
        });
      }
      setLoading(false);
    });
  }, [agentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.model.trim()) {
      setError("Name and model are required");
      return;
    }
    
    setSaving(true);
    try {
      const agent: AgentConfig = {
        name: form.name.trim(),
        provider: form.provider,
        model: form.model.trim(),
        working_directory: form.working_directory.trim(),
        ...(form.system_prompt.trim() ? { system_prompt: form.system_prompt.trim() } : {}),
      };
      
      await saveAgent(agentId, agent);
      router.push("/agents");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Agent</h1>
          <p className="text-muted-foreground">Editing @{agentId}</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent ID</label>
                <Input value={agentId} disabled className="font-mono opacity-50" />
                <p className="text-xs text-muted-foreground">ID cannot be changed</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Code Reviewer"
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider *</label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => setForm({ ...form, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Model *</label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g. claude-sonnet-4-20250514"
                  className="font-mono"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Working Directory</label>
              <Input
                value={form.working_directory}
                onChange={(e) => setForm({ ...form, working_directory: e.target.value })}
                placeholder="/path/to/workspace (optional)"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">System Prompt</label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                placeholder="Custom instructions for this agent (optional)..."
                rows={4}
              />
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Link href="/agents">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
