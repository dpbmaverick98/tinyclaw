'use client';

import { useClawStore } from '@/stores/useClawStore';
import { ThemeToggle } from './ThemeToggle';

export function TopBar() {
  const { notifications, showNotifications, setShowNotifications, connected } = useClawStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <header className="h-10 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-[var(--text-primary)] font-medium">
          tinyTUI
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ● {unreadCount > 0 && <span className="text-[var(--accent)]">{unreadCount}</span>}
        </button>
        
        <ThemeToggle />
      </div>
    </header>
  );
}
