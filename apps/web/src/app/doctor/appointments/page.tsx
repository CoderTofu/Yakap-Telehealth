"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YakapAvatar } from "@/components/yakap/avatar";
import { StatusBadge } from "@/components/yakap/status-badge";
import { EmptyState } from "@/components/yakap/empty-state";
import {
  APPOINTMENTS,
  formatDate,
  getPatient,
  type Status,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/doctor/appointments")({
  component: DoctorAppointments,
});

const COL: Record<Status, string> = {
  pending: "border-l-yakap-warning",
  confirmed: "border-l-yakap-accent",
  cancelled: "border-l-yakap-danger",
  completed: "border-l-slate-300",
};

function DoctorAppointments() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const all = APPOINTMENTS.filter((a) => a.doctorId === "d1");
  const upcoming = all.filter(
    (a) => a.status === "confirmed" || a.status === "pending",
  );
  const past = all.filter(
    (a) => a.status === "completed" || a.status === "cancelled",
  );
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-yakap-border bg-yakap-surface p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-yakap-primary text-white"
                : "text-yakap-text-secondary hover:text-yakap-text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-yakap-border bg-yakap-surface">
          <EmptyState
            icon={CalendarDays}
            title="No appointments"
            description={
              tab === "upcoming"
                ? "Your upcoming bookings will show here."
                : "Past consultations will appear here."
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const p = getPatient(a.patientId);
            if (!p) return null;
            return (
              <li
                key={a.id}
                className={cn(
                  "rounded-xl border border-yakap-border bg-yakap-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
                  COL[a.status],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <YakapAvatar
                      name={p.name}
                      color={p.avatarColor}
                      size={48}
                    />
                    <div>
                      <div className="font-medium text-yakap-text-primary">
                        {p.name}
                      </div>
                      <div className="text-xs text-yakap-text-muted">
                        {formatDate(a.date)} · {a.time}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tab === "upcoming" &&
                    a.status === "confirmed" &&
                    a.meetUrl && (
                      <Button
                        size="sm"
                        className="bg-yakap-primary hover:bg-yakap-primary-mid"
                        onClick={() => window.open(a.meetUrl, "_blank")}
                      >
                        <Video className="h-4 w-4" /> Join Consultation
                      </Button>
                    )}
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/doctor/appointments/$id" params={{ id: a.id }}>
                      {tab === "past" ? "View / Edit Notes" : "Add Notes"}
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
