'use client';

import { useClawStore } from '@/stores/useClawStore';
import { ChatPane } from '@/components/panes/ChatPane';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export function PaneContainer() {
  const { panes, activePaneId, setActivePane, closePane, agents, reorderPanes } = useClawStore();

  // Convert panes to grid layout items
  const layout = panes.map((pane, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      i: pane.id,
      x: col * 6,
      y: row * 8,
      w: 6,
      h: 8,
      minW: 3,
      minH: 4,
    };
  });

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
    <div className="flex-1 overflow-auto bg-[var(--bg-secondary)] p-2">
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        draggableHandle=".drag-handle"
        verticalCompact={true}
        onLayoutChange={(newLayout) => {
          const sorted = [...newLayout].sort((a: { y: number; x: number }, b: { y: number; x: number }) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
          reorderPanes(sorted.map((l: { i: string }) => l.i));
        }}
      >
        {panes.map((pane, index) => {
          const agent = agents.find(a => a.id === pane.agentId);
          const isActive = pane.id === activePaneId;
          
          return (
            <div
              key={pane.id}
              className={`
                bg-[var(--bg-primary)] border border-[var(--border-color)]
                flex flex-col overflow-hidden
                ${isActive ? 'ring-1 ring-[var(--text-secondary)]' : ''}
                ${pane.hasNewMessage ? 'ring-2 ring-[var(--accent)] !z-50' : 'z-0'}
              `}
              onClick={() => setActivePane(pane.id)}
              style={{
                boxShadow: pane.hasNewMessage ? '0 0 10px var(--accent)' : undefined,
              }}
            >
              {/* Drag Handle with Agent ID */}
              <div className="drag-handle h-6 bg-[var(--bg-tertiary)] cursor-move flex items-center justify-between px-2 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">:::</span>
                  {agent && (
                    <span className="text-xs text-[var(--text-secondary)]">
                      {agent.id}: {agent.name}
                      {agent.typing && (
                        <span className="ml-2 text-[var(--accent)] animate-pulse">...</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
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
              
              {/* Chat Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatPane
                  pane={pane}
                  isActive={isActive}
                  onActivate={() => setActivePane(pane.id)}
                />
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
