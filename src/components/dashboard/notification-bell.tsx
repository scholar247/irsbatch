"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils/cn";
import { NotificationItem } from "@/components/dashboard/notification-item";
import type { NotificationRecord } from "@/types/domain";

const POLL_INTERVAL_MS = 45_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ items: NotificationRecord[]; unreadCount: number }>(
        "/api/v1/notifications?limit=8"
      );
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — a failed poll shouldn't surface a toast for something this ambient.
    }
  }, []);

  useEffect(() => {
    // Mount-only fetch of server data unavailable during SSR — same intentional pattern as
    // src/components/ui/theme-toggle.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleItemClick(notification: NotificationRecord) {
    if (notification.readAt === null) {
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, readAt: Date.now() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      api.post(`/api/v1/notifications/${notification.id}/read`).catch(() => {});
    }
    setOpen(false);
    if (notification.deepLink) router.push(notification.deepLink);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:bg-surface-raised"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "surface-card absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto p-2",
            "origin-top-right"
          )}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-medium">Notifications</span>
            <a href="/dashboard/notifications" className="text-xs text-primary hover:underline">
              View all
            </a>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-foreground-muted">No notifications yet.</p>
          ) : (
            <div className="space-y-0.5">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleItemClick}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
