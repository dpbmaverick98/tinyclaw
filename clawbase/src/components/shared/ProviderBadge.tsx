import { cn } from '@/lib/utils';
import { Provider, PROVIDER_COLORS, PROVIDER_ICONS } from '@/types';

interface ProviderBadgeProps {
  provider: Provider;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function ProviderBadge({
  provider,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}: ProviderBadgeProps) {
  const color = PROVIDER_COLORS[provider];
  const icon = PROVIDER_ICONS[provider];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {showIcon && <span>{icon}</span>}
      {showLabel && (
        <span className="capitalize">
          {provider === 'opencode' ? 'OpenCode' : provider}
        </span>
      )}
    </span>
  );
}
