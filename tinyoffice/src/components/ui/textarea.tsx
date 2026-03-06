import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, resize = "none", ...props }, ref) => {
    const resizeClass = {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x",
      both: "resize",
    }[resize];

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors",
          "placeholder:text-[var(--text-tertiary)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)] focus-visible:border-[var(--accent-blue)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          resizeClass,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
