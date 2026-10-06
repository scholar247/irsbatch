"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";
import type { Role } from "@/types/domain";

/**
 * Purely a navigation-context switcher: it changes which sidebar/nav is shown, never what
 * the user is authorized to do — every route still enforces its own permission check
 * server-side regardless of which role is "active" here.
 */
export function RoleSwitcher({
  roles,
  activeRole,
  onChange,
}: {
  roles: Role[];
  activeRole: Role;
  onChange: (role: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (roles.length <= 1) {
    return (
      <span className="rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground-muted">
        {ROLE_LABELS[activeRole]}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface-raised"
        aria-label="Switch role"
      >
        {ROLE_LABELS[activeRole]}
        <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
      </button>

      {open && (
        <div className="surface-card absolute right-0 z-50 mt-2 w-44 p-1">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                onChange(role);
                setOpen(false);
              }}
              className="focus-ring flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm hover:bg-surface-raised"
            >
              {ROLE_LABELS[role]}
              {role === activeRole && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
