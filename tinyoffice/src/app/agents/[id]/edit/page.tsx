"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAgents, saveAgent, type AgentConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, Loader2, Check } from "lucide-react";
import Link from "next/link";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "opencode", label: "OpenCode" },
];

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
    prompt_file: "",
  });

  useEffect(() => {
    async function loadAgent() {
      try {
        const agents = await getAgents();
        const agent = agents[agentId];
        
        if (!agent) {
          setError("Agent not found");
          setLoading(false);
          return;
        }
        
        setForm({
          name: agent.name,
          provider: agent.provider,
          model: agent.model,
          working_directory: agent.working_directory || "",
          system_prompt: agent.system_prompt || "",
          prompt_file: agent.prompt_file || "",
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    
    loadAgent();
  }, [agentId]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.model.trim()) {
      setError("Model is required");
      return;
    }
    
    setSaving(true);
    setError("");
    
    try {
      const agentConfig: AgentConfig = {
        name: form.name.trim(),
        provider: form.provider,
        model: form.model.trim(),
        working_directory: form.working_directory.trim(),
        ...(form.system_prompt.trim() ? { system_prompt: form.system_prompt.trim() } : {}),
        ...(form.prompt_file.trim() ? { prompt_file: form.prompt_file.trim() } : {}),
      };
      
      await saveAgent(agentId, agentConfig);
      router.push("/agents");
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

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Edit Agent</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Editing @{agentId}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-[var(--accent-blue)]" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Agent ID</label>
                <Input
                  value={agentId}
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
                  placeholder="e.g. Code Reviewer"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Provider *</label>
                <select
                  value={form.provider}
                  onChange={(e) => setField("provider", e.target.value)}
                  className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Model *</label>
                <Input
                  value={form.model}
                  onChange={(e) => setField("model", e.target.value)}
                  placeholder="e.g. claude-sonnet-4-20250514"
                  className="font-mono"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Working Directory</label>
              <Input
                value={form.working_directory}
                onChange={(e) => setField("working_directory", e.target.value)}
                placeholder="/path/to/workspace (optional)"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                System Prompt</label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setField("system_prompt", e.target.value)}
                placeholder="Custom instructions for this agent (optional)..."
                rows={3}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Prompt File</label>
              <Input
                value={form.prompt_file}
                onChange={(e) => setField("prompt_file", e.target.value)}
                placeholder="Path to prompt file (optional)"
                className="font-mono"
              />
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
              
              <Link href="/agents">
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
