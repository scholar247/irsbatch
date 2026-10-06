"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/dashboard/notification-item";
import type { NotificationRecord } from "@/types/domain";

interface NotificationsPayload {
  success: boolean;
  data: { items: NotificationRecord[]; unreadCount: number };
  pagination?: { nextCursor: string | null; hasMore: boolean };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (nextCursor: string | null) => {
    const params = new URLSearchParams({ limit: "20" });
    if (nextCursor) params.set("cursor", nextCursor);
    const res = await fetch(`/api/v1/notifications?${params.toString()}`, { credentials: "include" });
    const payload: NotificationsPayload = await res.json();
    if (!payload.success) return;
    setItems((prev) => (nextCursor ? [...prev, ...payload.data.items] : payload.data.items));
    setCursor(payload.pagination?.nextCursor ?? null);
    setHasMore(payload.pagination?.hasMore ?? false);
  }, []);

  useEffect(() => {
    // Mount-only fetch of server data unavailable during SSR — same intentional pattern as
    // src/components/ui/theme-toggle.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(null).finally(() => setLoading(false));
  }, [load]);

  function handleClick(notification: NotificationRecord) {
    if (notification.readAt === null) {
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, readAt: Date.now() } : n)));
      fetch(`/api/v1/notifications/${notification.id}/read`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
    if (notification.deepLink) router.push(notification.deepLink);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    await load(cursor);
    setLoadingMore(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium tracking-tight">Notifications</h1>

      <div className="surface-card p-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-foreground-muted">No notifications yet.</p>
        ) : (
          <div className="space-y-0.5">
            {items.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onClick={handleClick} />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
