"use client";

import { useState } from "react";
import { Bell, BellRing, CalendarCheck, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { NOTIFICATIONS, type Notification } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TYPE: Record<
  Notification["type"],
  { icon: typeof Bell; bg: string; color: string }
> = {
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

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS);
  const markAll = () =>
    setItems((arr) => arr.map((n) => ({ ...n, unread: false })));
  const toggle = (id: string) =>
    setItems((arr) =>
      arr.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );

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
        <Button variant="outline" size="sm" onClick={markAll}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {items.map((n) => {
          const conf = TYPE[n.type];
          const Icon = conf.icon;
          return (
            <li
              key={n.id}
              onClick={() => toggle(n.id)}
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