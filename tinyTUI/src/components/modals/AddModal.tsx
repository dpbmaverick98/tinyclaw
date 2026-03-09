'use client';

import { useState } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { Provider } from '@/types';
import { createAgent, createTeam } from '@/lib/api';

const PROVIDERS: Provider[] = ['anthropic', 'openai', 'opencode', 'kimi', 'minimax'];

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
  opencode: 'opencode-1.5',
  kimi: 'kimi-k2.5',
  minimax: 'minimax-text-01',
};

export function AddModal() {
  const { modalOpen, modalTab, setModalTab, closeModal, addAgent, addTeam, agents } = useClawStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agent form state
  const [agentForm, setAgentForm] = useState({
    id: '',
    name: '',
    provider: 'anthropic' as Provider,
    model: '',
  });

  // Team form state
  const [teamForm, setTeamForm] = useState({
    id: '',
    name: '',
    agentIds: [] as string[],
  });

  // Inline agent creation in team flow
  const [showInlineAgent, setShowInlineAgent] = useState(false);
  const [inlineAgent, setInlineAgent] = useState({
    id: '',
    name: '',
    provider: 'anthropic' as Provider,
  });

  if (!modalOpen) return null;

  const handleCreateAgent = async () => {
    if (!agentForm.id || !agentForm.name) return;
    setIsLoading(true);
    setError(null);

    try {
      const newAgent = await createAgent({
        id: agentForm.id,
        name: agentForm.name,
        provider: agentForm.provider,
        model: agentForm.model || DEFAULT_MODELS[agentForm.provider],
      });

      addAgent({
        id: newAgent.id,
        name: newAgent.name,
        provider: newAgent.provider as Provider,
        model: newAgent.model,
        status: 'idle',
      });

      setAgentForm({ id: '', name: '', provider: 'anthropic', model: '' });
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamForm.id || !teamForm.name) return;
    setIsLoading(true);
    setError(null);

    try {
      const newTeam = await createTeam({
        id: teamForm.id,
        name: teamForm.name,
        agents: teamForm.agentIds,
      });

      addTeam({
        id: newTeam.id,
        name: newTeam.name,
        agentIds: newTeam.agents,
      });

      setTeamForm({ id: '', name: '', agentIds: [] });
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInlineAgent = async () => {
    if (!inlineAgent.id || !inlineAgent.name) return;
    setIsLoading(true);
    setError(null);

    try {
      const newAgent = await createAgent({
        id: inlineAgent.id,
        name: inlineAgent.name,
        provider: inlineAgent.provider,
        model: DEFAULT_MODELS[inlineAgent.provider],
      });

      addAgent({
        id: newAgent.id,
        name: newAgent.name,
        provider: newAgent.provider as Provider,
        model: newAgent.model,
        status: 'idle',
      });

      setTeamForm(prev => ({ ...prev, agentIds: [...prev.agentIds, newAgent.id] }));
      setInlineAgent({ id: '', name: '', provider: 'anthropic' });
      setShowInlineAgent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAgentInTeam = (agentId: string) => {
    setTeamForm(prev => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter(id => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] bg-[var(--bg-primary)] border border-[var(--border-color)]">
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setModalTab('agent')}
              className={`text-sm ${modalTab === 'agent' ? 'text-[var(--text-primary)] border-b border-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
            >
              agent
            </button>
            <button
              onClick={() => setModalTab('team')}
              className={`text-sm ${modalTab === 'team' ? 'text-[var(--text-primary)] border-b border-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
            >
              team
            </button>
          </div>
          <button
            onClick={closeModal}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {modalTab === 'agent' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">id</label>
                <input
                  type="text"
                  value={agentForm.id}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                  placeholder="e.g., code-reviewer"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">name</label>
                <input
                  type="text"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                  placeholder="e.g., Code Reviewer"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">provider</label>
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map(p => (
                    <button
                      key={p}
                      onClick={() => setAgentForm(prev => ({ ...prev, provider: p }))}
                      className={`
                        px-3 py-1 text-xs border
                        ${agentForm.provider === p
                          ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}
                      `}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">model (optional)</label>
                <input
                  type="text"
                  value={agentForm.model}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                  placeholder={DEFAULT_MODELS[agentForm.provider]}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={handleCreateAgent}
                  disabled={!agentForm.id || !agentForm.name || isLoading}
                  className="px-4 py-2 text-sm bg-[var(--accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'creating...' : 'create'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">id</label>
                <input
                  type="text"
                  value={teamForm.id}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                  placeholder="e.g., backend-squad"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">name</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                  placeholder="e.g., Backend Squad"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2">members</label>

                <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 space-y-1 max-h-32 overflow-y-auto">
                  {agents.length === 0 && (
                    <div className="text-sm text-[var(--text-muted)]">no agents available</div>
                  )}
                  {agents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgentInTeam(agent.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-left text-sm hover:bg-[var(--bg-tertiary)]"
                    >
                      <span className={`
                        w-3 h-3 border border-[var(--border-color)] flex items-center justify-center text-[10px]
                        ${teamForm.agentIds.includes(agent.id) ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : ''}
                      `}>
                        {teamForm.agentIds.includes(agent.id) && 'x'}
                      </span>
                      <span className={teamForm.agentIds.includes(agent.id) ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                        {agent.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Inline agent creation */}
                {!showInlineAgent ? (
                  <button
                    onClick={() => setShowInlineAgent(true)}
                    className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    + create new agent
                  </button>
                ) : (
                  <div className="mt-2 p-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
                    <input
                      type="text"
                      value={inlineAgent.id}
                      onChange={(e) => setInlineAgent(prev => ({ ...prev, id: e.target.value }))}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none"
                      placeholder="id"
                    />
                    <input
                      type="text"
                      value={inlineAgent.name}
                      onChange={(e) => setInlineAgent(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none"
                      placeholder="name"
                    />
                    <div className="flex gap-1">
                      {PROVIDERS.map(p => (
                        <button
                          key={p}
                          onClick={() => setInlineAgent(prev => ({ ...prev, provider: p }))}
                          className={`px-2 py-1 text-[10px] border ${inlineAgent.provider === p ? 'border-[var(--text-primary)]' : 'border-[var(--border-color)]'}`}
                        >
                          {p.slice(0, 3)}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInlineAgent(false)}
                        className="text-xs text-[var(--text-muted)]"
                      >
                        cancel
                      </button>
                      <button
                        onClick={handleCreateInlineAgent}
                        disabled={!inlineAgent.id || !inlineAgent.name || isLoading}
                        className="text-xs text-[var(--accent)] disabled:opacity-50"
                      >
                        {isLoading ? 'creating...' : 'create'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={!teamForm.id || !teamForm.name || isLoading}
                  className="px-4 py-2 text-sm bg-[var(--accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'creating...' : 'create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
