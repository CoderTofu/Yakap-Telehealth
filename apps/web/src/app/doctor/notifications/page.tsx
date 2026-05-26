"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BellRing, CalendarCheck, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/doctor/notifications")({
  component: DoctorNotifications,
});

const ITEMS = [
  {
    id: "n1",
    icon: BellRing,
    type: "reminder",
    message: "Reminder: consultation with Sofia Reyes at 11:30 AM today.",
    time: "30 min ago",
    unread: true,
  },
  {
    id: "n2",
    icon: Bell,
    type: "booking",
    message: "New booking request from Miguel Torres.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "n3",
    icon: CalendarCheck,
    type: "confirmed",
    message: "Juan Dela Cruz rescheduled to Wednesday 2:30 PM.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "n4",
    icon: X,
    type: "cancelled",
    message: "Appointment with Anna Reyes was cancelled.",
    time: "3 days ago",
    unread: false,
  },
];

const STYLES: Record<string, { bg: string; color: string }> = {
  reminder: { bg: "bg-yakap-warning-light", color: "text-[#92400E]" },
  booking: { bg: "bg-yakap-primary-light", color: "text-yakap-primary" },
  confirmed: { bg: "bg-yakap-accent-light", color: "text-[#065F46]" },
  cancelled: { bg: "bg-yakap-danger-light", color: "text-[#991B1B]" },
};

function DoctorNotifications() {
  const [items, setItems] = useState(ITEMS);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((arr) => arr.map((n) => ({ ...n, unread: false })))
          }
        >
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>
      <ul className="overflow-hidden rounded-xl border border-yakap-border bg-yakap-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {items.map((n) => {
          const Icon = n.icon;
          const s = STYLES[n.type];
          return (
            <li
              key={n.id}
              onClick={() =>
                setItems((arr) =>
                  arr.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
                )
              }
              className={cn(
                "flex cursor-pointer items-center gap-4 border-b border-yakap-border px-5 py-4 last:border-b-0",
                n.unread ? "bg-yakap-primary-light/40" : "hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  s.bg,
                )}
              >
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-yakap-text-primary">
                  {n.message}
                </div>
                <div className="text-xs text-yakap-text-muted">{n.time}</div>
              </div>
              {n.unread && (
                <span className="h-2 w-2 rounded-full bg-yakap-primary-mid" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
