'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Activity } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useClawStore, useTeamById } from '@/stores/useClawStore';
import { Agent } from '@/types';

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  agent: Agent;
  isLeader: boolean;
}

interface Edge {
  source: string;
  target: string;
}

export function TeamTopology({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const team = useTeamById(teamId);
  const agents = useClawStore((state) => state.agents);
  const setSelectedAgentId = useClawStore((state) => state.setSelectedAgentId);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [dimensions] = useState({ width: 800, height: 500 });
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!team) return;

    const teamAgents = agents.filter((a) => team.config.agents.includes(a.id));
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Initialize nodes in circle
    const initialNodes: Node[] = teamAgents.map((agent, i) => {
      const angle = (i / teamAgents.length) * Math.PI * 2;
      const radius = 150;
      return {
        id: agent.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        agent,
        isLeader: agent.id === team.config.leader_agent,
      };
    });

    // Create edges (leader to all, plus some cross-connections)
    const initialEdges: Edge[] = [];
    const leaderId = team.config.leader_agent;
    
    // Leader connects to everyone
    teamAgents.forEach((agent) => {
      if (agent.id !== leaderId) {
        initialEdges.push({ source: leaderId, target: agent.id });
      }
    });

    // Cross connections for non-leaders
    const nonLeaders = teamAgents.filter((a) => a.id !== leaderId);
    for (let i = 0; i < nonLeaders.length; i++) {
      for (let j = i + 1; j < nonLeaders.length; j++) {
        if (Math.random() > 0.5) {
          initialEdges.push({ source: nonLeaders[i].id, target: nonLeaders[j].id });
        }
      }
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [team, agents, dimensions]);

  // Simple force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes((prevNodes) => {
        const newNodes = [...prevNodes];
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          const node = newNodes[i];
          
          // Center attraction
          node.vx += (centerX - node.x) * 0.001;
          node.vy += (centerY - node.y) * 0.001;

          // Repulsion between nodes
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            const other = newNodes[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 500 / (dist * dist);
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }

          // Damping
          node.vx *= 0.9;
          node.vy *= 0.9;

          // Update position
          node.x += node.vx;
          node.y += node.vy;

          // Bounds
          node.x = Math.max(40, Math.min(dimensions.width - 40, node.x));
          node.y = Math.max(40, Math.min(dimensions.height - 40, node.y));
        }

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, dimensions]);

  if (!team) return null;

  const activeAgents = nodes.filter((n) => n.agent.status === 'active').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{team.config.name}</h1>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <span>{team.config.agents.length} agents</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Activity size={14} className="text-blue-400" />
                  {activeAgents} active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-white/50">Leader</p>
            <p className="text-white font-medium">@{team.config.leader_agent}</p>
          </div>
        </div>
      </div>

      {/* Topology Graph */}
      <GlassCard className="relative overflow-hidden" hover={false}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full"
          style={{ height: 500 }}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.4)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            return (
              <g key={i}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="url(#edgeGradient)"
                  strokeWidth={2}
                  opacity={0.6}
                />
                {/* Animated particle on edge */}
                <circle r={3} fill="#8B5CF6">
                  <animateMotion
                    dur={`${2 + Math.random()}s`}
                    repeatCount="indefinite"
                    path={`M${source.x},${source.y} L${target.x},${target.y}`}
                  />
                </circle>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => setSelectedAgentId(node.id)}
            >
              {/* Glow effect for active */}
              {node.agent.status === 'active' && (
                <circle
                  r={35}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  opacity={0.5}
                  filter="url(#glow)"
                >
                  <animate
                    attributeName="r"
                    values="35;40;35"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Node circle */}
              <circle
                r={30}
                fill={node.isLeader ? '#8B5CF6' : 'rgba(255,255,255,0.1)'}
                stroke={node.isLeader ? '#A78BFA' : 'rgba(255,255,255,0.2)'}
                strokeWidth={2}
              />

              {/* Initial */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={16}
                fontWeight="bold"
              >
                {node.agent.config.name.charAt(0).toUpperCase()}
              </text>

              {/* Leader crown */}
              {node.isLeader && (
                <text y={-38} textAnchor="middle" fontSize={14}>👑</text>
              )}

              {/* Status dot */}
              <circle
                cx={20}
                cy={-20}
                r={6}
                fill={
                  node.agent.status === 'active'
                    ? '#3B82F6'
                    : node.agent.status === 'idle'
                    ? '#22C55E'
                    : '#6B7280'
                }
                stroke="#0A0A0F"
                strokeWidth={2}
              />

              {/* Label */}
              <text
                y={45}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize={12}
              >
                @{node.id}
              </text>
            </g>
          ))}
        </svg>

        {/* Overlay info */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-white/60">Leader</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <span className="text-white/60">Member</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-white/60">Active</span>
          </div>
        </div>
      </GlassCard>

      {/* Agent List */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {team.config.agents.map((agentId) => {
          const agent = agents.find((a) => a.id === agentId);
          if (!agent) return null;
          
          return (
            <GlassCard
              key={agentId}
              className="p-4 cursor-pointer"
              onClick={() => setSelectedAgentId(agentId)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  {agent.config.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{agent.config.name}</p>
                  <p className="text-sm text-white/50">@{agentId}</p>
                </div>
                {agentId === team.config.leader_agent && (
                  <span className="ml-auto">👑</span>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}
