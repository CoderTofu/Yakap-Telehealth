"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  APPOINTMENTS,
  formatDate,
  getPatient,
  type Status,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const COL: Record<Status, string> = {
  pending: "border-l-warning",
  confirmed: "border-l-accent",
  cancelled: "border-l-danger",
  completed: "border-l-slate-300",
};

export default function DoctorAppointments() {
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
      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
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
                  "rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
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
                      <div className="font-medium text-text-primary">
                        {p.name}
                      </div>
                      <div className="text-xs text-text-muted">
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
                        className="bg-primary hover:bg-primary-mid"
                        onClick={() => window.open(a.meetUrl, "_blank")}
                      >
                        <Video className="h-4 w-4" /> Join Consultation
                      </Button>
                    )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/doctor/appointments/${a.id}`}>
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
