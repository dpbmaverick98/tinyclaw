'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/shared/GlassCard';
import { ProviderBadge } from '@/components/shared/ProviderBadge';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { Agent } from '@/types';
import { useClawStore, useTeamById } from '@/stores/useClawStore';

interface AgentCardProps {
  agent: Agent;
  index: number;
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const setSelectedAgentId = useClawStore((state) => state.setSelectedAgentId);
  const team = useTeamById(agent.teamId || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <GlassCard
        className="group h-full"
        onClick={() => setSelectedAgentId(agent.id)}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-semibold text-[var(--text-primary)]">
                {agent.config.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">{agent.config.name}</h3>
                <p className="text-sm text-[var(--text-tertiary)]">@{agent.id}</p>
              </div>
            </div>
            <StatusIndicator status={agent.status} size="sm" />
          </div>

          {/* Provider */}
          <div className="mb-3">
            <ProviderBadge provider={agent.config.provider} />
          </div>

          {/* System Prompt Preview */}
          {agent.config.system_prompt && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
              {agent.config.system_prompt}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)] mb-3">
            <span>{agent.messageCount || 0} msgs</span>
            <span>{agent.fileCount || 0} files</span>
          </div>

          {/* Team Badge */}
          {team && (
            <div className="pt-3 border-t border-[var(--border-light)]">
              <span className="text-sm text-[var(--text-secondary)]">
                {agent.isLeader ? 'Leader' : 'Member'} of {team.config.name}
              </span>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
