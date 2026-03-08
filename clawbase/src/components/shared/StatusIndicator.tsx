import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'idle' | 'active' | 'error' | 'offline';
  size?: 'sm' | 'md';
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  const statusColors = {
    idle: 'bg-[var(--status-idle)]',
    active: 'bg-[var(--status-active)]',
    error: 'bg-[var(--accent-error)]',
    offline: 'bg-[var(--status-offline)]',
  };

  return (
    <span className="relative flex">
      <span
        className={cn(
          'rounded-full',
          sizeClasses[size],
          statusColors[status]
        )}
      >
        {status === 'active' && (
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-40 animate-ping',
              sizeClasses[size],
              statusColors[status]
            )}
          />
        )}
      </span>
    </span>
  );
}
