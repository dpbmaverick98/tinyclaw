import { cn } from '@/lib/utils';
import { Provider } from '@/types';

interface ProviderBadgeProps {
  provider: Provider;
  size?: 'sm' | 'md';
  className?: string;
}

// Simplified - just text, no icons, minimal colors
const providerLabels: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  opencode: 'OpenCode',
  kimi: 'Kimi',
  minimax: 'MiniMax',
};

export function ProviderBadge({
  provider,
  size = 'sm',
  className,
}: ProviderBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex rounded font-medium',
        'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
        sizeClasses[size],
        className
      )}
    >
      {providerLabels[provider]}
    </span>
  );
}
