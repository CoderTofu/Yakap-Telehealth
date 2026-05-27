"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  APPOINTMENTS,
  formatDate,
  getDoctor,
  type Status,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<Status, string> = {
  pending: "border-l-warning",
  confirmed: "border-l-accent",
  cancelled: "border-l-danger",
  completed: "border-l-slate-300",
};

export default function PatientAppointments() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reschedId, setReschedId] = useState<string | null>(null);

  const all = APPOINTMENTS.filter((a) => a.patientId === "p1");
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
            title={
              tab === "upcoming"
                ? "No upcoming appointments"
                : "No past appointments"
            }
            description={
              tab === "upcoming"
                ? "Book your first consultation to get started."
                : "Your completed visits will appear here."
            }
            action={
              tab === "upcoming" ? (
                <Button asChild className="bg-primary hover:bg-primary-mid">
                  <Link href="/patient/doctors">Find a Doctor</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const doc = getDoctor(a.doctorId)!;
            return (
              <li
                key={a.id}
                className={cn(
                  "rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
                  STATUS_COLORS[a.status],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <YakapAvatar
                      name={doc.name}
                      color={doc.avatarColor}
                      size={48}
                    />
                    <div>
                      <div className="font-medium text-text-primary">
                        {doc.name}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {doc.specialty}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
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
                  {tab === "upcoming" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReschedId(a.id)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger-light hover:text-danger"
                        onClick={() => setCancelId(a.id)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {tab === "past" && a.status === "completed" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/patient/appointments/${a.id}`}>
                        View Notes
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/patient/appointments/${a.id}`}>
                      Details
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Cancel appointment?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The doctor will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>
              Go Back
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90"
              onClick={() => setCancelId(null)}
            >
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reschedId} onOpenChange={(o) => !o && setReschedId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Reschedule
            </DialogTitle>
            <DialogDescription>
              Pick a new date and time that works for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="date"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>9:00 AM</option>
              <option>10:00 AM</option>
              <option>11:00 AM</option>
              <option>2:00 PM</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-mid"
              onClick={() => setReschedId(null)}
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}