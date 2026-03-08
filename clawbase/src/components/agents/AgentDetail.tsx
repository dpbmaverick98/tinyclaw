'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, FolderOpen, Settings, Activity, Send, Paperclip } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { ProviderBadge } from '@/components/shared/ProviderBadge';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { useClawStore, useAgentById, useTeamById } from '@/stores/useClawStore';
import { sendMessage } from '@/lib/api';

interface AgentDetailProps {
  onClose?: () => void;
}

export function AgentDetail({ onClose }: AgentDetailProps = {}) {
  const selectedAgentId = useClawStore((state) => state.selectedAgentId);
  const setSelectedAgentId = useClawStore((state) => state.setSelectedAgentId);
  const agent = useAgentById(selectedAgentId);
  const team = useTeamById(agent?.teamId || '');
  
  const [activeTab, setActiveTab] = useState<'chat' | 'work' | 'settings'>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string }>>([]);
  const [isSending, setIsSending] = useState(false);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[var(--text-secondary)]">
        <div className="text-center">
          <p>Loading agent...</p>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!message.trim() || !agent) return;
    
    setIsSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    
    try {
      await sendMessage(message, agent.id);
      setMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={agent.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="h-full flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedAgentId(null);
                onClose?.();
              }}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl font-bold text-[var(--text-primary)]"
              >
                {agent.config.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">{agent.config.name}</h1>
                <div className="flex items-center gap-2">
                  <StatusIndicator status={agent.status} size="sm" />
                  <span className="text-sm text-[var(--text-tertiary)] font-mono">@{agent.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-xl p-1">
            {[
              { id: 'chat', icon: MessageSquare, label: 'Chat' },
              { id: 'work', icon: FolderOpen, label: 'Work' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3 space-y-4">
            <GlassCard className="p-4" hover={false}>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-tertiary)]">Provider</label>
                  <ProviderBadge provider={agent.config.provider} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-tertiary)]">Model</label>
                  <p className="text-sm text-[var(--text-primary)] font-mono">{agent.config.model}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-tertiary)]">Working Directory</label>
                  <p className="text-sm text-[var(--text-secondary)] font-mono truncate">{agent.config.working_directory}</p>
                </div>
              </div>
            </GlassCard>

            {team && (
              <GlassCard className="p-4" hover={false}>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Team: {team.config.name}</h3>
                <div className="space-y-2">
                  {team.config.agents.map((agentId) => (
                    <div
                      key={agentId}
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        agentId === agent.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-primary)]">
                        {agentId.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">@{agentId}</span>
                      {agentId === team.config.leader_agent && (
                        <span className="text-xs text-[var(--accent-primary)]">Leader</span>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-4" hover={false}>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Activity</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-tertiary)]">Messages</span>
                  <span className="text-sm text-[var(--text-primary)]">{agent.messageCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-tertiary)]">Files</span>
                  <span className="text-sm text-[var(--text-primary)]">{agent.fileCount || 0}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {activeTab === 'chat' && (
              <GlassCard className="h-full flex flex-col" hover={false}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-tertiary)]">
                      <div className="text-center">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Start a conversation with @{agent.id}</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
                      <Paperclip size={20} />
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={`Message @${agent.id}...`}
                      className="flex-1 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <button
                      onClick={handleSend}
                      disabled={isSending || !message.trim()}
                      className="p-2 rounded-xl bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {activeTab === 'work' && (
              <GlassCard className="h-full p-6" hover={false}>
                <div className="text-center text-[var(--text-tertiary)]">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Work history and generated files will appear here</p>
                </div>
              </GlassCard>
            )}

            {activeTab === 'settings' && (
              <GlassCard className="h-full p-6" hover={false}>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--text-primary)]">Agent Settings</h3>
                  <p className="text-[var(--text-secondary)]">Settings editing coming soon...</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
