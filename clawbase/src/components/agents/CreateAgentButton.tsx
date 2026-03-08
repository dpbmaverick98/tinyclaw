'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Bot } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { ProviderBadge } from '@/components/shared/ProviderBadge';
import { createAgent } from '@/lib/api';
import { Provider } from '@/types';

const PROVIDERS: Provider[] = ['anthropic', 'openai', 'opencode', 'kimi', 'minimax'];

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-5-20251001',
  openai: 'gpt-4o',
  opencode: 'opencode-1.5',
  kimi: 'kimi-k2.5',
  minimax: 'minimax-text-01',
};

export function CreateAgentButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    provider: 'anthropic' as Provider,
    model: '',
    systemPrompt: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createAgent(formData.id, {
        name: formData.name,
        provider: formData.provider,
        model: formData.model || DEFAULT_MODELS[formData.provider],
        working_directory: `~/.claw/agents/${formData.id}`,
        system_prompt: formData.systemPrompt || undefined,
      });

      setIsOpen(false);
      setFormData({
        id: '',
        name: '',
        provider: 'anthropic',
        model: '',
        systemPrompt: '',
      });
      
      window.location.reload();
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/20 transition-colors"
      >
        <Plus size={18} />
        <span>New Agent</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-lg mx-4">
                <GlassCard className="p-6" hover={false}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                        <Bot size={20} className="text-[var(--accent-primary)]" />
                      </div>
                      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create New Agent</h2>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Agent ID</label>
                        <input
                          type="text"
                          value={formData.id}
                          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                          placeholder="e.g., code-reviewer"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Display Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Code Reviewer"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">Provider</label>
                      <div className="flex flex-wrap gap-2">
                        {PROVIDERS.map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                provider,
                                model: DEFAULT_MODELS[provider],
                              });
                            }}
                            className={`transition-all ${
                              formData.provider === provider ? 'ring-2 ring-[var(--accent-primary)]' : ''
                            }`}
                          >
                            <ProviderBadge provider={provider} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Model (optional)</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder={DEFAULT_MODELS[formData.provider]}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1.5">System Prompt (optional)</label>
                      <textarea
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                        placeholder="You are a helpful assistant..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isLoading ? 'Creating...' : 'Create Agent'}
                      </button>
                    </div>
                  </form>
                </GlassCard>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
