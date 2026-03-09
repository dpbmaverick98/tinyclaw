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
  
  // Simple flex layout with resize handles
  const isHorizontal = panes.length <= 2;
  
  return (
    <div className={`flex-1 flex ${isHorizontal ? '' : 'flex-col'} overflow-hidden`}>
      {panes.map((pane, index) => (
        <div key={pane.id} className="flex flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-w-0 min-h-0">
            <ChatPane
              pane={pane}
              isActive={pane.id === activePaneId}
              onActivate={() => setActivePane(pane.id)}
            />
          </div>
          {index < panes.length - 1 && (
            <ResizeHandle direction={isHorizontal ? 'vertical' : 'horizontal'} />
          )}
        </div>
      ))}
    </div>
  );
}

function ResizeHandle({ direction }: { direction: 'vertical' | 'horizontal' }) {
  return (
    <div
      className={`
        ${direction === 'vertical' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        bg-[var(--border-color)] hover:bg-[var(--accent)]
        transition-colors
      `}
      onMouseDown={() => {
        // Resize logic placeholder - will implement full resize later
        const handleMouseUp = () => {
          document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mouseup', handleMouseUp);
      }}
    />
  );
}
