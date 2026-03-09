'use client';

import { useClawStore } from '@/stores/useClawStore';
import { ChatPane } from '@/components/panes/ChatPane';
import { useState, useCallback } from 'react';

interface PaneLayout {
  id: string;
  agentId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function PaneContainer() {
  const { panes, activePaneId, setActivePane, closePane, agents } = useClawStore();
  const [layouts, setLayouts] = useState<PaneLayout[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);

  // Initialize layouts for new panes
  const getLayout = useCallback((paneId: string, agentId: string, index: number): PaneLayout => {
    const existing = layouts.find(l => l.id === paneId);
    if (existing) return existing;
    
    // Default grid: 2 columns, auto rows
    const col = index % 2;
    const row = Math.floor(index / 2);
    
    return {
      id: paneId,
      agentId,
      x: col * 50, // percentage
      y: row * 50,
      w: 50,
      h: 50,
    };
  }, [layouts]);

  // Update layout when panes change
  const currentLayouts = panes.map((pane, index) => 
    getLayout(pane.id, pane.agentId, index)
  );

  // Sync layouts state
  if (currentLayouts.length !== layouts.length) {
    setLayouts(currentLayouts);
  }

  const handleDragStart = (paneId: string) => {
    setDragging(paneId);
  };

  const handleDragMove = useCallback((e: React.MouseEvent, paneId: string) => {
    if (dragging !== paneId) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setLayouts(prev => prev.map(l => 
      l.id === paneId 
        ? { ...l, x: Math.max(0, Math.min(80, x - l.w / 2)), y: Math.max(0, Math.min(80, y - l.h / 2)) }
        : l
    ));
  }, [dragging]);

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleResizeStart = (paneId: string) => {
    setResizing(paneId);
  };

  const handleResizeMove = useCallback((e: React.MouseEvent, paneId: string) => {
    if (resizing !== paneId) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    const layout = layouts.find(l => l.id === paneId);
    if (!layout) return;
    
    const w = ((e.clientX - rect.left) / rect.width) * 100 - layout.x;
    const h = ((e.clientY - rect.top) / rect.height) * 100 - layout.y;
    
    setLayouts(prev => prev.map(l => 
      l.id === paneId 
        ? { ...l, w: Math.max(20, Math.min(80, w)), h: Math.max(20, Math.min(80, h)) }
        : l
    ));
  }, [resizing, layouts]);

  const handleResizeEnd = () => {
    setResizing(null);
  };

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
      className="flex-1 relative overflow-hidden bg-[var(--bg-secondary)]"
      onMouseMove={(e) => {
        if (dragging) handleDragMove(e, dragging);
        if (resizing) handleResizeMove(e, resizing);
      }}
      onMouseUp={() => {
        handleDragEnd();
        handleResizeEnd();
      }}
      onMouseLeave={() => {
        handleDragEnd();
        handleResizeEnd();
      }}
    >
      {panes.map((pane) => {
        const layout = layouts.find(l => l.id === pane.id) || { x: 0, y: 0, w: 50, h: 50 };
        const agent = agents.find(a => a.id === pane.agentId);
        
        return (
          <div
            key={pane.id}
            className={`
              absolute bg-[var(--bg-primary)] border border-[var(--border-color)]
              flex flex-col
              ${pane.id === activePaneId ? 'ring-1 ring-[var(--text-secondary)] z-10' : 'z-0'}
              ${pane.hasNewMessage ? 'pane-new-message ring-1 ring-[var(--accent)]' : ''}
            `}
            style={{
              left: `${layout.x}%`,
              top: `${layout.y}%`,
              width: `${layout.w}%`,
              height: `${layout.h}%`,
            }}
            onClick={() => setActivePane(pane.id)}
          >
            {/* Drag Handle with Agent ID */}
            <div
              className="h-6 bg-[var(--bg-tertiary)] cursor-move flex items-center justify-between px-2 select-none"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleDragStart(pane.id);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">:::</span>
                {agent && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {agent.id}: {agent.name}
                  </span>
                )}
              </div>
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
            
            {/* Chat Content */}
            <div className="flex-1 min-h-0">
              <ChatPane
                pane={pane}
                isActive={pane.id === activePaneId}
                onActivate={() => setActivePane(pane.id)}
              />
            </div>
            
            {/* Resize Handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleResizeStart(pane.id);
              }}
            >
              <svg 
                viewBox="0 0 10 10" 
                className="w-full h-full text-[var(--text-muted)]"
                fill="currentColor"
              >
                <path d="M0 10 L10 10 L10 0 Z" opacity="0.3" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
