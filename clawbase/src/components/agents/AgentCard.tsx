'use client';

import { motion } from 'framer-motion';
import { MessageSquare, FolderOpen, Crown } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { ProviderBadge } from '@/components/shared/ProviderBadge';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { Agent, PROVIDER_COLORS } from '@/types';
import { useClawStore } from '@/stores/useClawStore';

interface AgentCardProps {
  agent: Agent;
  index: number;
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const setSelectedAgentId = useClawStore((state) => state.setSelectedAgentId);
  const team = useClawStore((state) => state.getTeamById(agent.teamId || ''));
  
  const providerColor = PROVIDER_COLORS[agent.config.provider];
  const isActive = agent.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard
        className="group h-full"
        glow={isActive ? providerColor : undefined}
        onClick={() => setSelectedAgentId(agent.id)}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{
                  backgroundColor: `${providerColor}20`,
                  color: providerColor,
                }}
              >
                {agent.config.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{agent.config.name}</h3>
                <p className="text-sm text-white/50 font-mono">@{agent.id}</p>
              </div>
            </div>
            <StatusIndicator status={agent.status} />
          </div>

          {/* Model & Provider */}
          <div className="flex items-center gap-2 mb-3">
            <ProviderBadge provider={agent.config.provider} size="sm" />
            <span className="text-xs text-white/40">{agent.config.model}</span>
          </div>

          {/* System Prompt Preview */}
          {agent.config.system_prompt && (
            <p className="text-sm text-white/60 line-clamp-2 mb-4">
              &ldquo;{agent.config.system_prompt}&rdquo;
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <MessageSquare size={14} />
              <span>{agent.messageCount || 0} msgs</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <FolderOpen size={14} />
              <span>{agent.fileCount || 0} files</span>
            </div>
          </div>

          {/* Team Badge */}
          {team && (
            <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08]">
              {agent.isLeader && (
                <Crown size={14} className="text-yellow-400" />
              )}
              <span className="text-sm text-white/60">
                {agent.isLeader ? 'Leader of ' : 'Member of '}
                <span className="text-white/80">{team.config.name}</span>
              </span>
            </div>
          )}

          {/* Hover Actions */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAgentId(agent.id);
              }}
            >
              <MessageSquare size={16} className="text-white" />
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
