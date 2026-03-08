import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'idle' | 'active' | 'error' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusColors = {
  idle: '#6B7280',
  active: '#3B82F6',
  error: '#EF4444',
  offline: '#374151',
};

export function StatusIndicator({ status, size = 'md', pulse = true }: StatusIndicatorProps) {
  const color = statusColors[status];
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className="relative flex">
      <span
        className={cn(
          'relative inline-flex rounded-full',
          sizeClasses[size]
        )}
        style={{ backgroundColor: color }}
      >
        {pulse && status === 'active' && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: color }}
          />
        )}
      </span>
    </span>
  );
}
