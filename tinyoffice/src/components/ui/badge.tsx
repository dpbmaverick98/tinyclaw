import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]",
        secondary: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
        outline: "border border-[var(--border)] text-[var(--text-secondary)]",
        success: "bg-[var(--accent-green)]/10 text-[var(--accent-green)]",
        warning: "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]",
        error: "bg-[var(--accent-red)]/10 text-[var(--accent-red)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
