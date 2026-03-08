import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, glow, onClick }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl',
        'overflow-hidden',
        hover && 'cursor-pointer transition-all duration-300',
        hover && 'hover:bg-white/[0.06] hover:border-white/[0.12]',
        className
      )}
      onClick={onClick}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      style={glow ? {
        boxShadow: `0 0 40px ${glow}20, inset 0 1px 0 ${glow}10`,
      } : {
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {glow && (
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glow}15, transparent 60%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
