import * as React from "react";

import { cn } from "@/components/ui/utils";

const badgeVariants = {
  default: "border-transparent bg-[var(--accent)] text-[var(--surface)]",
  secondary: "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]",
  positive: "border-transparent bg-[var(--good)] text-[var(--good-contrast)]",
  outline: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium leading-none",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
