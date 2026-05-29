"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarCheck,
  CheckCheck,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type UiNotificationType = "reminder" | "booking" | "confirmed" | "cancelled";

type NotificationApiItem = {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type NotificationItem = {
  id: string;
  type: UiNotificationType;
  message: string;
  unread: boolean;
  time: string;
};

const TYPE: Record<UiNotificationType, { icon: LucideIcon; bg: string; color: string }> = {
  booking: {
    icon: Bell,
    bg: "bg-primary-light",
    color: "text-primary",
  },
  reminder: {
    icon: BellRing,
    bg: "bg-warning-light",
    color: "text-[#92400E]",
  },
  confirmed: {
    icon: CalendarCheck,
    bg: "bg-accent-light",
    color: "text-[#065F46]",
  },
  cancelled: { icon: X, bg: "bg-danger-light", color: "text-[#991B1B]" },
};

function notifyNotificationsChanged() {
  window.dispatchEvent(new Event("notifications:changed"));
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds) {
      return formatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return formatter.format(seconds, "second");
}

function mapNotificationType(type: string): UiNotificationType {
  if (type.includes("confirmed") || type.includes("completed")) {
    return "confirmed";
  }

  if (type.includes("rejected") || type.includes("cancelled")) {
    return "cancelled";
  }

  if (type.includes("pending") || type.includes("rescheduled")) {
    return "booking";
  }

  return "reminder";
}

function toNotificationItem(item: NotificationApiItem): NotificationItem {
  return {
    id: item.id,
    type: mapNotificationType(item.type),
    message: item.message,
    unread: !item.is_read,
    time: formatRelativeTime(item.created_at),
  };
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const json = await apiRequest<{ data: NotificationApiItem[] }>(
          "/api/v1/notifications/me",
        );

        if (mounted) {
          setItems(Array.isArray(json.data) ? json.data.map(toNotificationItem) : []);
        }
      } catch (error) {
        console.error("failed to fetch patient notifications", error);
        if (mounted) {
          setItems([]);
        }
      }
    }

    void fetchNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  async function markOneAsRead(id: string) {
    setItems((arr) =>
      arr ? arr.map((item) => (item.id === id ? { ...item, unread: false } : item)) : arr,
    );
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    } catch (error) {
      console.error("failed to mark notification as read", error);
    } finally {
      notifyNotificationsChanged();
    }
  }

  async function markAllAsRead() {
    if (!items || busy) return;

    const unreadIds = items.filter((item) => item.unread).map((item) => item.id);
    if (unreadIds.length === 0) return;

    setBusy(true);
    setItems((arr) => (arr ? arr.map((item) => ({ ...item, unread: false })) : arr));

    try {
      await Promise.allSettled(
        unreadIds.map((id) =>
          apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
        ),
      );
    } finally {
      setBusy(false);
      notifyNotificationsChanged();
    }
  }

  if (items === null) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={Bell}
          title="You have no notifications"
          description="We'll let you know when there's an update."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={busy}>
          <CheckCheck className="h-4 w-4" /> {busy ? "Updating..." : "Mark all as read"}
        </Button>
      </div>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {items.map((n) => {
          const conf = TYPE[n.type];
          const Icon = conf.icon;
          return (
            <li
              key={n.id}
              onClick={() => void markOneAsRead(n.id)}
              className={cn(
                "flex cursor-pointer items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 transition-colors",
                n.unread
                  ? "bg-primary-light/40"
                  : "bg-surface hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  conf.bg,
                )}
              >
                <Icon className={cn("h-4 w-4", conf.color)} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-text-primary">{n.message}</div>
                <div className="text-xs text-text-muted">{n.time}</div>
              </div>
              {n.unread && (
                <span className="h-2 w-2 rounded-full bg-primary-mid" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}