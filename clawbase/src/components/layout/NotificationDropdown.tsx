'use client';

import { useClawStore } from '@/stores/useClawStore';

export function NotificationDropdown() {
  const { notifications, showNotifications, setShowNotifications, markNotificationRead, markAllNotificationsRead, openPane } = useClawStore();
  
  if (!showNotifications) return null;
  
  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markNotificationRead(notif.id);
    openPane(notif.agentId);
    setShowNotifications(false);
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={() => setShowNotifications(false)}
      />
      
      {/* Dropdown */}
      <div className="absolute top-10 right-16 w-80 bg-[var(--bg-primary)] border border-[var(--border-color)] z-50 shadow-lg">
        <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
          <span className="text-sm text-[var(--text-primary)]">notifications</span>
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              no notifications
            </div>
          )}
          
          {notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`
                w-full px-4 py-3 text-left border-b border-[var(--border-color)] last:border-b-0
                hover:bg-[var(--bg-secondary)]
                ${!notif.read ? 'bg-[var(--accent-dim)]' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-primary)]">{notif.agentName}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-[var(--text-secondary)] truncate">
                {notif.preview}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
