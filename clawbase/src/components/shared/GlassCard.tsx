import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, onClick }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-xl border',
        'bg-[var(--bg-card)] border-[var(--border-color)]',
        hover && 'cursor-pointer transition-all duration-200',
        hover && 'hover:border-[var(--accent-primary)] hover:shadow-sm',
        className
      )}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
}
