"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type AppointmentItem = {
  id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  doctor_name?: string;
  patient_name?: string;
  video_room_url?: string | null;
};

type DoctorAvailability = {
  doctor_id: string;
  from: string;
  to: string;
  slots: Array<{ starts_at: string; ends_at: string }>;
};

const STATUS_COLORS: Record<AppointmentItem["status"], string> = {
  pending: "border-l-warning",
  confirmed: "border-l-accent",
  cancelled: "border-l-danger",
  completed: "border-l-slate-300",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function toInputDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(iso),
  );
}

function toInputTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function formatAvailabilityDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function formatAvailabilityTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

export default function PatientAppointments() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [appointments, setAppointments] = useState<AppointmentItem[] | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleAvailability, setRescheduleAvailability] = useState<DoctorAvailability | null>(null);
  const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchAppointments() {
      try {
        const json = await apiRequest<{ data: AppointmentItem[] }>(
          "/api/v1/appointments/me",
        );

        if (mounted) {
          setAppointments(Array.isArray(json.data) ? json.data : []);
        }
      } catch (error) {
        console.error("failed to fetch appointments", error);
        if (mounted) setAppointments([]);
      }
    }

    fetchAppointments();

    return () => {
      mounted = false;
    };
  }, []);

  const all = appointments ?? [];
  const upcoming = all.filter(
    (appointment) =>
      appointment.status === "confirmed" || appointment.status === "pending",
  );
  const past = all.filter(
    (appointment) =>
      appointment.status === "completed" || appointment.status === "cancelled",
  );
  const list = tab === "upcoming" ? upcoming : past;

  const rescheduleTarget = useMemo(
    () => all.find((appointment) => appointment.id === rescheduleId) ?? null,
    [all, rescheduleId],
  );

  const rescheduleSlotsForDate = useMemo(
    () =>
      rescheduleAvailability?.slots.filter(
        (slot) => toInputDate(slot.starts_at) === rescheduleDate,
      ) ?? [],
    [rescheduleAvailability, rescheduleDate],
  );

  useEffect(() => {
    if (!rescheduleTarget) return;
    setRescheduleDate(toInputDate(rescheduleTarget.scheduled_at));
    setRescheduleTime(toInputTime(rescheduleTarget.scheduled_at));
  }, [rescheduleTarget]);

  useEffect(() => {
    let mounted = true;

    async function fetchAvailability() {
      if (!rescheduleTarget) {
        setRescheduleAvailability(null);
        return;
      }

      setRescheduleAvailabilityLoading(true);
      try {
        const start = new Date();
        const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
        const json = await apiRequest<{ data: DoctorAvailability }>(
          `/api/v1/doctors/${rescheduleTarget.doctor_id}/availability?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`,
          {},
          { auth: false },
        );

        if (mounted) {
          setRescheduleAvailability(json.data ?? null);
          const firstSlot = json.data?.slots?.[0];
          if (firstSlot) {
            setRescheduleDate(toInputDate(firstSlot.starts_at));
            setRescheduleTime(toInputTime(firstSlot.starts_at));
          }
        }
      } catch (error) {
        console.error("failed to fetch availability", error);
        if (mounted) setRescheduleAvailability(null);
      } finally {
        if (mounted) setRescheduleAvailabilityLoading(false);
      }
    }

    fetchAvailability();

    return () => {
      mounted = false;
    };
  }, [rescheduleTarget]);

  async function refreshAppointments() {
    const json = await apiRequest<{ data: AppointmentItem[] }>(
      "/api/v1/appointments/me",
    );
    setAppointments(Array.isArray(json.data) ? json.data : []);
  }

  async function openMeeting(appointmentId: string) {
    try {
      const json = await apiRequest<{ data: { video_room_url: string } }>(
        `/api/v1/appointments/${appointmentId}/meeting`,
      );

      const url = json.data?.video_room_url;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to open meeting");
    }
  }

  async function handleCancel() {
    if (!cancelId) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/v1/appointments/${cancelId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setCancelId(null);
      await refreshAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to cancel appointment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReschedule() {
    if (
      !rescheduleTarget ||
      !rescheduleDate ||
      !rescheduleTime ||
      !rescheduleSlotsForDate.some(
        (slot) => toInputTime(slot.starts_at) === rescheduleTime,
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/v1/appointments/${rescheduleTarget.id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduled_at: `${rescheduleDate}T${rescheduleTime}:00+08:00`,
          duration_minutes: rescheduleTarget.duration_minutes,
        }),
      });
      setRescheduleId(null);
      await refreshAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reschedule appointment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        {(["upcoming", "past"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === value
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {appointments === null ? (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading appointments...
          </div>
        </div>
      ) : list.length === 0 ? (
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
          {list.map((appointment) => {
            const doctorName = appointment.doctor_name ?? "Doctor";

            return (
              <li
                key={appointment.id}
                className={cn(
                  "rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
                  STATUS_COLORS[appointment.status],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <YakapAvatar name={doctorName} color="#0B4F71" size={48} />
                    <div>
                      <div className="font-medium text-text-primary">
                        {doctorName}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {formatDate(appointment.scheduled_at)} · {formatTime(appointment.scheduled_at)}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {appointment.status === "confirmed" ? (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-mid"
                      onClick={() => openMeeting(appointment.id)}
                    >
                      <Video className="h-4 w-4" /> Open Meet
                    </Button>
                  ) : null}

                  {tab === "upcoming" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRescheduleId(appointment.id)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger-light hover:text-danger"
                        onClick={() => setCancelId(appointment.id)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                  {tab === "past" && appointment.status === "completed" ? (
                    <Link href={`/patient/appointments/${appointment.id}`}>
                      <Button size="sm" variant="outline">Notes</Button>
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!cancelId} onOpenChange={(value) => !value && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Cancel appointment?</DialogTitle>
            <DialogDescription>
              This action will notify the doctor and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>
              Go Back
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90"
              disabled={isSubmitting}
              onClick={handleCancel}
            >
              {isSubmitting ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleId} onOpenChange={(value) => !value && setRescheduleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Reschedule appointment</DialogTitle>
            <DialogDescription>
              Pick one of the doctor&apos;s available slots. The appointment will go back to pending for doctor confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {rescheduleAvailabilityLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking the doctor&apos;s current schedule...
              </div>
            ) : rescheduleAvailability?.slots?.length ? (
              <>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-text-secondary">
                  Available slots are based on Dr. {rescheduleTarget?.doctor_name ?? "the doctor"}&apos;s schedule and current bookings.
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="block text-xs uppercase tracking-wide text-text-muted">Date</span>
                    <select
                      value={rescheduleDate}
                      onChange={(event) => {
                        const nextDate = event.target.value;
                        setRescheduleDate(nextDate);
                        const firstSlotForDay = rescheduleAvailability.slots.find(
                          (slot) => toInputDate(slot.starts_at) === nextDate,
                        );
                        if (firstSlotForDay) {
                          setRescheduleTime(toInputTime(firstSlotForDay.starts_at));
                        } else {
                          setRescheduleTime("");
                        }
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {Array.from(
                        new Map(
                          rescheduleAvailability.slots.map((slot) => [
                            toInputDate(slot.starts_at),
                            slot.starts_at,
                          ]),
                        ).entries(),
                      ).map(([dateKey, firstSlot]) => (
                        <option key={dateKey} value={dateKey}>
                          {formatAvailabilityDate(firstSlot)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="block text-xs uppercase tracking-wide text-text-muted">Time</span>
                    <select
                      value={rescheduleTime}
                      onChange={(event) => setRescheduleTime(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {rescheduleSlotsForDate.map((slot) => (
                        <option key={slot.starts_at} value={toInputTime(slot.starts_at)}>
                          {formatAvailabilityTime(slot.starts_at)} - {formatAvailabilityTime(slot.ends_at)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="text-xs text-text-muted">
                  Only the slots shown above are currently open. If you need a different time, choose another open slot in the doctor&apos;s schedule.
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
                No open slots are available for this doctor in the next 14 days.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-mid"
              disabled={isSubmitting || !rescheduleSlotsForDate.length}
              onClick={handleReschedule}
            >
              {isSubmitting ? "Saving..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
