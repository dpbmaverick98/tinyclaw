'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, X, Crown, Users } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useClawStore } from '@/stores/useClawStore';
import { Agent } from '@/types';

interface SortableAgentItemProps {
  agent: Agent;
  isLeader: boolean;
  onRemove: () => void;
  onSetLeader: () => void;
}

function SortableAgentItem({ agent, isLeader, onRemove, onSetLeader }: SortableAgentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-secondary)] group"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 rounded hover:bg-[var(--bg-tertiary)] cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} className="text-[var(--text-tertiary)]" />
      </button>

      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-primary)]">
        {agent.config.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1">
        <p className="text-sm text-[var(--text-primary)]">{agent.config.name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">@{agent.id}</p>
      </div>

      <button
        onClick={onSetLeader}
        className={`p-1.5 rounded transition-colors ${
          isLeader ? 'text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/20' : 'text-[var(--text-tertiary)] hover:text-[var(--accent-secondary)]'
        }`}
        title={isLeader ? 'Leader' : 'Set as leader'}
      >
        <Crown size={14} />
      </button>

      <button
        onClick={onRemove}
        className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface TeamBuilderProps {
  onClose: () => void;
}

export function TeamBuilder({ onClose }: TeamBuilderProps) {
  const agents = useClawStore((state) => state.agents);
  const [teamAgents, setTeamAgents] = useState<Agent[]>([]);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const availableAgents = agents.filter(
    (a) => !teamAgents.some((ta) => ta.id === a.id)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveAvailable = availableAgents.some((a) => a.id === activeId);
    const isOverTeam = overId === 'team-drop-zone' || teamAgents.some((a) => a.id === overId);

    if (isActiveAvailable && isOverTeam) {
      const agent = availableAgents.find((a) => a.id === activeId);
      if (agent) {
        setTeamAgents((prev) => [...prev, agent]);
        if (!leaderId) setLeaderId(agent.id);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    if (teamAgents.some((a) => a.id === activeId) && teamAgents.some((a) => a.id === overId)) {
      const oldIndex = teamAgents.findIndex((a) => a.id === activeId);
      const newIndex = teamAgents.findIndex((a) => a.id === overId);
      setTeamAgents(arrayMove(teamAgents, oldIndex, newIndex));
    }
  };

  const handleSave = () => {
    console.log('Saving team:', {
      agents: teamAgents.map((a) => a.id),
      leader: leaderId,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-secondary)]/10 flex items-center justify-center">
            <Users size={20} className="text-[var(--accent-secondary)]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Team Builder</h2>
            <p className="text-sm text-[var(--text-secondary)]">Drag agents to create teams</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={teamAgents.length < 2}
            className="px-4 py-2 rounded-xl bg-[var(--accent-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Save Team
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-6">
          {/* Available Agents */}
          <GlassCard className="p-4" hover={false}>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Available Agents</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableAgents.length === 0 ? (
                <p className="text-center text-[var(--text-tertiary)] py-8">All agents assigned</p>
              ) : (
                availableAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] cursor-grab active:cursor-grabbing hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <GripVertical size={16} className="text-[var(--text-tertiary)]" />
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-primary)]">
                      {agent.config.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{agent.config.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">@{agent.id}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Team Drop Zone */}
          <GlassCard
            className="p-4 border-2 border-dashed border-[var(--border-color)]"
            hover={false}
          >
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
              Team Members {teamAgents.length > 0 && `(${teamAgents.length})`}
            </h3>

            <SortableContext items={teamAgents.map((a) => a.id)}>
              <div className="space-y-2 min-h-[200px]">
                {teamAgents.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-[var(--text-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-xl">
                    <p>Drag agents here</p>
                  </div>
                ) : (
                  teamAgents.map((agent) => (
                    <SortableAgentItem
                      key={agent.id}
                      agent={agent}
                      isLeader={agent.id === leaderId}
                      onRemove={() => {
                        setTeamAgents((prev) => prev.filter((a) => a.id !== agent.id));
                        if (leaderId === agent.id) {
                          const remaining = teamAgents.filter((a) => a.id !== agent.id);
                          setLeaderId(remaining[0]?.id || null);
                        }
                      }}
                      onSetLeader={() => setLeaderId(agent.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>

            {teamAgents.length >= 2 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-secondary)]">
                  Leader: <span className="text-[var(--accent-secondary)]">@{leaderId}</span>
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-card)] shadow-xl">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-secondary)]/20 flex items-center justify-center text-[var(--text-primary)]">
                {agents.find((a) => a.id === activeId)?.config.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[var(--text-primary)]">@{activeId}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
}
