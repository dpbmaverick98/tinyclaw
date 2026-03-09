'use client';

import { useClawStore } from '@/stores/useClawStore';
import { ChatPane } from '@/components/panes/ChatPane';

export function PaneContainer() {
  const { panes, activePaneId, setActivePane } = useClawStore();
  
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
  
  // Simple grid layout - can be enhanced with resizable splits later
  const gridCols = panes.length === 1 ? 'grid-cols-1' : 
                   panes.length === 2 ? 'grid-cols-2' : 
                   panes.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
  
  return (
    <div className={`flex-1 grid ${gridCols} gap-px bg-[var(--border-color)] overflow-auto`}>
      {panes.map(pane => (
        <ChatPane
          key={pane.id}
          pane={pane}
          isActive={pane.id === activePaneId}
          onActivate={() => setActivePane(pane.id)}
        />
      ))}
    </div>
  );
}
