'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Plus } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { GlassCard } from '@/components/shared/GlassCard';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const agents = useClawStore((state) => state.agents);
  const teams = useClawStore((state) => state.teams);
  const setSelectedAgentId = useClawStore((state) => state.setSelectedAgentId);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (value: string) => {
    if (value.startsWith('agent:')) {
      setSelectedAgentId(value.replace('agent:', ''));
    } else if (value === 'create-agent') {
      // Trigger create agent modal via custom event
      window.dispatchEvent(new CustomEvent('open-create-agent'));
    }
    setOpen(false);
    setSearch('');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-start justify-center pt-[20vh] z-50 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-2xl mx-4">
              <GlassCard className="overflow-hidden" hover={false}>
                <Command
                  value={search}
                  onValueChange={setSearch}
                  onSelect={(value: unknown) => handleSelect(value as string)}
                  className="[&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]]:py-3 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:text-white [&_[cmdk-input]]:placeholder:text-white/30 [&_[cmdk-input]]:focus:outline-none [&_[cmdk-list]]:max-h-[400px] [&_[cmdk-list]]:overflow-y-auto [&_[cmdk-group]]:px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-white/40 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item][data-selected=true]]:bg-white/10"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
                    <Search size={20} className="text-white/40" />
                    <Command.Input
                      placeholder="Search agents, teams, or commands..."
                      className="flex-1 bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                    />
                    <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/50">ESC</kbd>
                  </div>

                  <Command.List className="p-2">
                    <Command.Empty className="py-8 text-center text-white/40">
                      No results found.
                    </Command.Empty>

                    <Command.Group heading="Quick Actions">
                      <Command.Item
                        value="create-agent"
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Plus size={16} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white">Create New Agent</p>
                          <p className="text-sm text-white/40">Add a new agent to your workspace</p>
                        </div>
                      </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Agents">
                      {agents.map((agent) => (
                        <Command.Item
                          key={agent.id}
                          value={`agent:${agent.id}`}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{
                              backgroundColor: `rgba(255,255,255,0.1)`,
                            }}
                          >
                            {agent.config.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-white">{agent.config.name}</p>
                            <p className="text-sm text-white/40">@{agent.id} • {agent.config.provider}</p>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              agent.status === 'active'
                                ? 'bg-blue-400'
                                : agent.status === 'idle'
                                ? 'bg-green-400'
                                : 'bg-gray-400'
                            }`}
                          />
                        </Command.Item>
                      ))}
                    </Command.Group>

                    <Command.Group heading="Teams">
                      {teams.map((team) => (
                        <Command.Item
                          key={team.id}
                          value={`team:${team.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Users size={16} className="text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white">{team.config.name}</p>
                            <p className="text-sm text-white/40">{team.config.agents.length} agents</p>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </Command.List>
                </Command>
              </GlassCard>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
