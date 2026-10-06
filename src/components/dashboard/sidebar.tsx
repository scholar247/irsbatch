"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { navForWorkspace } from "@/components/dashboard/nav-config";
import type { Permission, Role } from "@/types/domain";

export function Sidebar({ activeRole, permissions }: { activeRole: Role; permissions: Permission[] }) {
  const pathname = usePathname();
  const items = navForWorkspace(activeRole, permissions);

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 flex-shrink-0 py-8 pr-6 sm:block">
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-foreground-muted hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
