"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import { Sidebar } from "@/components/dashboard/sidebar";
import { defaultRouteForRole } from "@/components/dashboard/nav-config";
import { Container } from "@/components/ui/container";
import type { Permission, Role } from "@/types/domain";

const ACTIVE_ROLE_KEY = "irsb-active-role";

export function DashboardShell({
  roles,
  permissions,
  children,
}: {
  roles: Role[];
  permissions: Permission[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<Role>(roles[0]);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(ACTIVE_ROLE_KEY);
    } catch {
      // Private browsing / blocked storage: fall back to the first role silently.
    }
    // Mount-only sync from localStorage (unavailable during SSR) — same intentional
    // pattern as src/components/ui/theme-toggle.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveRole(stored && roles.includes(stored as Role) ? (stored as Role) : roles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRoleChange(role: Role) {
    setActiveRole(role);
    try {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } catch {
      // Ignore — the selection still applies for this page view via component state.
    }
    router.push(defaultRouteForRole(role));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="surface-glass sticky top-0 z-40">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-display text-lg font-semibold">
            IRS Batch <span className="text-gradient-primary">2007</span>
          </Link>
          <div className="flex items-center gap-2">
            <RoleSwitcher roles={roles} activeRole={activeRole} onChange={handleRoleChange} />
            <NotificationBell />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </Container>
      </header>

      <Container className="flex items-start gap-8">
        <Sidebar activeRole={activeRole} permissions={permissions} />
        <main className="min-w-0 flex-1 py-10">{children}</main>
      </Container>
    </div>
  );
}
