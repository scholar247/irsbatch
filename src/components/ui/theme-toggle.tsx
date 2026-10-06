"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("irsb-theme");
    } catch {
      // Private browsing / blocked storage: fall back to light silently.
    }
    // This mount-only sync from localStorage (unavailable during SSR) is the standard
    // hydration-safe pattern for client-only preferences: there's no way to know the
    // stored theme before the client renders once, so a placeholder-then-sync effect is
    // intentional here rather than an "avoid this effect" case. Light is the default
    // until the user explicitly picks dark — we never infer from OS preference.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "light" || stored === "dark" ? stored : "light");
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("irsb-theme", theme);
    } catch {
      // Ignore — theme still applies for this page view via the DOM attribute.
    }
  }, [theme]);

  if (!theme) return <div className={cn("h-9 w-9", className)} aria-hidden />;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:bg-surface-raised",
        className
      )}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
