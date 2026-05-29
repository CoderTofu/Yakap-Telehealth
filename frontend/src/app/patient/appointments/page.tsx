"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Star, Video } from "lucide-react";

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
  rating: number | null;
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
  const [rateId, setRateId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleAvailability, setRescheduleAvailability] = useState<DoctorAvailability | null>(null);
  const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);

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

  const rateTarget = useMemo(
    () => all.find((appointment) => appointment.id === rateId) ?? null,
    [all, rateId],
  );

  const counts = {
    upcoming: upcoming.length,
    past: past.length,
    total: all.length,
  };

  const rescheduleSlotsForDate = useMemo(
    () =>
      rescheduleAvailability?.slots.filter(
        (slot) => toInputDate(slot.starts_at) === rescheduleDate,
      ) ?? [],
    [rescheduleAvailability, rescheduleDate],
  );

  useEffect(() => {
    if (!rescheduleTarget) return;
    // Do not pre-fill the dropdowns; require the user to explicitly select
    // a date and time when rescheduling.
    setRescheduleDate("");
    setRescheduleTime("");
  }, [rescheduleTarget]);

  useEffect(() => {
    if (!rateTarget) {
      setRatingValue(0);
      return;
    }

    setRatingValue(rateTarget.rating ?? 0);
  }, [rateTarget]);

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
          // Do not auto-select the first available slot here. Keep the
          // reschedule date/time as the current appointment values so
          // users must explicitly choose a different slot if they want to.
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

  async function handleRate() {
    if (!rateTarget || ratingValue < 1 || ratingValue > 5) return;

    setIsSubmitting(true);
    try {
      await apiRequest(`/api/v1/appointments/${rateTarget.id}/rate`, {
        method: "PATCH",
        body: JSON.stringify({ rating: ratingValue }),
      });
      setRateId(null);
      await refreshAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save rating");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="bg-linear-to-br from-primary-light via-surface to-surface px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                Appointments overview
              </div>
              <h2 className="mt-4 font-serif text-3xl text-text-primary md:text-4xl">
                Your appointments
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                Keep track of upcoming consultations, manage reschedules, and review completed visits in one place.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-border bg-surface p-1 shadow-sm">
              {(["upcoming", "past"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors cursor-pointer",
                    tab === value
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Upcoming" value={String(counts.upcoming)} helper="Pending and confirmed" />
            <MetricCard label="Past" value={String(counts.past)} helper="Completed or cancelled" />
            <MetricCard label="Total" value={String(counts.total)} helper="All appointment history" />
          </div>
        </div>
      </section>

      {appointments === null ? (
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading appointments...
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-border bg-surface">
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
        <ul className="mx-auto w-full max-w-5xl space-y-3">
          {list.map((appointment) => {
            const doctorName = appointment.doctor_name ?? "Doctor";
            const isConfirmed = appointment.status === "confirmed";

            return (
              <li
                key={appointment.id}
                className={cn(
                  "rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
                  STATUS_COLORS[appointment.status],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <YakapAvatar name={doctorName} color="#0B4F71" size={40} />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">
                        {doctorName}
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        {formatDate(appointment.scheduled_at)} · {formatTime(appointment.scheduled_at)}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                <div className="mt-3 rounded-2xl border border-border bg-muted/20 px-3 py-2.5">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <InfoPill label="Date" value={formatDate(appointment.scheduled_at)} />
                    <InfoPill label="Time" value={formatTime(appointment.scheduled_at)} />
                    <InfoPill label="Duration" value={`${appointment.duration_minutes} min`} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isConfirmed ? (
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
                    <>
                      <Link href={`/patient/appointments/${appointment.id}`}>
                        <Button
                          size="sm"
                          className="border-primary/20 bg-primary-light text-primary hover:bg-primary/20 hover:text-primary"
                        >
                          Notes
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-text-primary hover:bg-muted/30 hover:text-text-primary"
                        onClick={() => setRateId(appointment.id)}
                      >
                        {appointment.rating ? "Update Rating" : "Rate"}
                      </Button>
                    </>
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
            <DialogDescription className="text-text-secondary">
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
            <DialogDescription className="text-text-secondary">
              Pick one of the doctor&apos;s available slots. The appointment will go back to pending for doctor confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {rescheduleAvailabilityLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking the doctor&apos;s current schedule...
              </div>
            ) : rescheduleAvailability?.slots?.length ? (
              <>
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-text-secondary">
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
                        // Do not auto-select a time; user must pick explicitly.
                        setRescheduleTime("");
                      }}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm cursor-pointer"
                    >
                      <option value="">Select a date</option>
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
                      disabled={!rescheduleDate}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm cursor-pointer"
                    >
                      <option value="">Select a time</option>
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
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
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
              disabled={isSubmitting || !(rescheduleDate && rescheduleTime)}
              onClick={handleReschedule}
            >
              {isSubmitting ? "Saving..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rateId} onOpenChange={(value) => !value && setRateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Rate appointment</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Select how many stars you want to give Dr. {rateTarget?.doctor_name ?? "the doctor"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => {
                const active = value <= ratingValue;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRatingValue(value)}
                    className={cn(
                      "rounded-full p-2 transition-transform cursor-pointer hover:scale-105",
                      active ? "text-amber-500" : "text-border",
                    )}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  >
                    <Star className={cn("h-8 w-8", active && "fill-current")} />
                  </button>
                );
              })}
            </div>
            <div className="text-center text-sm text-text-secondary">
              {ratingValue > 0
                ? `${ratingValue} star${ratingValue === 1 ? "" : "s"}`
                : "Choose 1 to 5 stars"}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-mid"
              disabled={isSubmitting || ratingValue < 1}
              onClick={handleRate}
            >
              {isSubmitting ? "Saving..." : "Confirm Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-3.5 shadow-sm backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-serif text-text-primary">{value}</div>
      <div className="mt-1 text-sm text-text-secondary">{helper}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-text-primary">{value}</div>
    </div>
  );
}
