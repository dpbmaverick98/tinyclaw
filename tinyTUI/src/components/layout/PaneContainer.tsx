'use client';

import { useClawStore } from '@/stores/useClawStore';
import { ChatPane } from '@/components/panes/ChatPane';
import { useState, useCallback, useRef } from 'react';

interface PaneLayout {
  id: string;
  agentId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const GRID_SIZE = 10;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function PaneContainer() {
  const { panes, activePaneId, setActivePane, closePane, agents, teams, reorderPanes } = useClawStore();
  const [layouts, setLayouts] = useState<PaneLayout[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get team name for an agent (if they're a team leader)
  const getAgentTeamName = useCallback((agentId: string): string | null => {
    const team = teams.find(t => t.agentIds[0] === agentId);
    return team?.name || null;
  }, [teams]);

  // Initialize layouts for new panes
  const getLayout = useCallback((paneId: string, agentId: string, index: number): PaneLayout => {
    const existing = layouts.find(l => l.id === paneId);
    if (existing) return existing;
    
    const col = index % 2;
    const row = Math.floor(index / 2);
    
    return {
      id: paneId,
      agentId,
      x: col * 50,
      y: row * 50,
      w: 50,
      h: 50,
    };
  }, [layouts]);

  const currentLayouts = panes.map((pane, index) => 
    getLayout(pane.id, pane.agentId, index)
  );

  if (currentLayouts.length !== layouts.length) {
    setLayouts(currentLayouts);
  }

  const handleDragStart = (paneId: string) => {
    setDragging(paneId);
  };

  const handleDragMove = useCallback((e: React.MouseEvent, paneId: string) => {
    if (dragging !== paneId) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setLayouts(prev => prev.map(l => 
      l.id === paneId 
        ? { ...l, x: Math.max(0, Math.min(90, x - l.w / 2)), y: Math.max(0, y) }
        : l
    ));
  }, [dragging]);

  const handleDragEnd = () => {
    if (dragging) {
      setLayouts(prev => {
        const newLayouts = prev.map(l => 
          l.id === dragging 
            ? { ...l, x: snapToGrid(l.x), y: snapToGrid(l.y) }
            : l
        );
        
        // Push overlapping panes down
        const draggedLayout = newLayouts.find(l => l.id === dragging);
        if (draggedLayout) {
          newLayouts.forEach(l => {
            if (l.id !== dragging) {
              // Check for overlap
              const overlapX = Math.abs(l.x - draggedLayout.x) < Math.min(l.w, draggedLayout.w);
              const overlapY = Math.abs(l.y - draggedLayout.y) < Math.min(l.h, draggedLayout.h);
              
              if (overlapX && overlapY) {
                // Push down
                l.y = snapToGrid(draggedLayout.y + draggedLayout.h + 5);
              }
            }
          });
        }
        
        return newLayouts;
      });
    }
    setDragging(null);
  };

  const maxY = Math.max(...layouts.map(l => l.y + l.h), 100);

  if (panes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
        <div className="text-center">
          <div className="mb-2">no open chats</div>
          <div className="text-xs">select an agent from sidebar</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-auto bg-[var(--bg-secondary)]"
      style={{ minHeight: '100%' }}
      onMouseMove={(e) => {
        if (dragging) handleDragMove(e, dragging);
      }}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      <div style={{ height: `${maxY}%`, minHeight: '100%', position: 'relative' }}>
        {panes.map((pane, index) => {
          const layout = layouts.find(l => l.id === pane.id) || { x: 0, y: 0, w: 50, h: 50 };
          const agent = agents.find(a => a.id === pane.agentId);
          const isActive = pane.id === activePaneId;
          const hasNewMessage = pane.hasNewMessage;
          const teamName = agent ? getAgentTeamName(agent.id) : null;
          
          return (
            <div
              key={pane.id}
              className={`
                absolute bg-[var(--bg-primary)] border border-[var(--border-color)]
                flex flex-col overflow-hidden
                ${isActive ? 'ring-1 ring-[var(--text-secondary)]' : ''}
                ${hasNewMessage ? 'ring-2 ring-[var(--accent)]' : ''}
              `}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${layout.w}%`,
                height: `${layout.h}%`,
                zIndex: hasNewMessage ? 100 : isActive ? 50 : dragging === pane.id ? 40 : 10,
                boxShadow: hasNewMessage ? '0 0 15px var(--accent)' : undefined,
              }}
              onClick={() => setActivePane(pane.id)}
            >
              {/* Drag Handle */}
              <div
                className="h-6 bg-[var(--bg-tertiary)] cursor-move flex items-center justify-between px-2 select-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleDragStart(pane.id);
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">:::</span>
                  {agent && (
                    <span className="text-xs text-[var(--text-secondary)] truncate">
                      {agent.id}: {agent.name}
                      {teamName && (
                        <span className="text-[var(--text-muted)]"> ({teamName})</span>
                      )}
                      {agent.typing && (
                        <span className="ml-2 text-[var(--accent)] animate-pulse">...</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const newOrder = [...panes.map(p => p.id)];
                      if (index > 0) {
                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                        reorderPanes(newOrder);
                      }
                    }}
                    disabled={index === 0}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newOrder = [...panes.map(p => p.id)];
                      if (index < panes.length - 1) {
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        reorderPanes(newOrder);
                      }
                    }}
                    disabled={index === panes.length - 1}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closePane(pane.id);
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                  >
                    x
                  </button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0">
                <ChatPane
                  pane={pane}
                  isActive={isActive}
                  onActivate={() => setActivePane(pane.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
