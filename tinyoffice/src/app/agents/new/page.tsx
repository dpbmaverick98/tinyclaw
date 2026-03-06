"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAgent, type AgentConfig } from "@/lib/api";
import { PROVIDERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, Loader2, Check } from "lucide-react";
import Link from "next/link";

export default function NewAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    provider: "anthropic",
    model: "",
    working_directory: "",
    system_prompt: "",
    prompt_file: "",
  });

  const setField = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.id.trim()) {
      setError("Agent ID is required");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.model.trim()) {
      setError("Model is required");
      return;
    }
    if (/\s/.test(form.id)) {
      setError("ID cannot contain spaces");
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
      
      await saveAgent(form.id.toLowerCase(), agentConfig);
      router.push("/agents");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

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
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">New Agent</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Create a new AI agent</p>
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
                  Agent ID *</label>
                <Input
                  value={form.id}
                  onChange={(e) => setField("id", e.target.value)}
                  placeholder="e.g. coder"
                  className="font-mono"
                />
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Unique identifier, no spaces</p>
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
                <Select
                  value={form.provider}
                  onChange={(e) => setField("provider", e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </Select>
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
                resize="vertical"
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Create Agent
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
