import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "primary" | "accent" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-primary-soft text-success",
  warning: "bg-accent-soft text-warning",
  danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-danger",
  neutral: "bg-surface-raised text-foreground-muted border border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
