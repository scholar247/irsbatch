import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils/cn";
import type { NotificationRecord } from "@/types/domain";

export function NotificationItem({
  notification,
  onClick,
  compact = false,
}: {
  notification: NotificationRecord;
  onClick: (notification: NotificationRecord) => void;
  compact?: boolean;
}) {
  const unread = notification.readAt === null;
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={cn(
        "focus-ring flex w-full items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors hover:bg-surface-raised",
        unread && "bg-primary-soft/40"
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
          unread ? "bg-danger" : "bg-transparent"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{notification.title}</span>
        <span className={cn("block text-sm text-foreground-muted", compact && "truncate")}>
          {notification.body}
        </span>
        <span className="mt-0.5 block text-xs text-foreground-muted">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </span>
      </span>
    </button>
  );
}
