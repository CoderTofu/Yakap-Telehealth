"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

const COL: Record<AppointmentItem["status"], string> = {
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

export default function DoctorAppointments() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [appointments, setAppointments] = useState<AppointmentItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
        console.error("failed to fetch doctor appointments", error);
        if (mounted) setAppointments([]);
      }
    }

    fetchAppointments();

    return () => {
      mounted = false;
    };
  }, []);

  const all = appointments ?? [];
  const upcoming = useMemo(
    () => all.filter((appointment) => appointment.status === "pending" || appointment.status === "confirmed"),
    [all],
  );
  const past = useMemo(
    () => all.filter((appointment) => appointment.status === "completed" || appointment.status === "cancelled"),
    [all],
  );
  const list = tab === "upcoming" ? upcoming : past;

  const counts = {
    pending: all.filter((appointment) => appointment.status === "pending").length,
    confirmed: all.filter((appointment) => appointment.status === "confirmed").length,
    completed: all.filter((appointment) => appointment.status === "completed").length,
  };

  function canCompleteAppointment(appointment: AppointmentItem) {
    const endsAt = new Date(
      new Date(appointment.scheduled_at).getTime() + appointment.duration_minutes * 60 * 1000,
    );
    return endsAt.getTime() <= Date.now();
  }

  async function refreshAppointments() {
    const json = await apiRequest<{ data: AppointmentItem[] }>(
      "/api/v1/appointments/me",
    );
    setAppointments(Array.isArray(json.data) ? json.data : []);
  }

  async function performAction(
    appointmentId: string,
    endpoint: string,
    body: Record<string, string> = {},
  ) {
    setBusyId(appointmentId);
    try {
      await apiRequest(endpoint, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refreshAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update appointment");
    } finally {
      setBusyId(null);
    }
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

  return (
    <div className="space-y-6">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="bg-linear-to-br from-primary-light via-surface to-surface px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                Doctor schedule board
              </div>
              <h2 className="mt-4 font-serif text-3xl text-text-primary md:text-4xl">
                Appointments
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                Review requests, confirm visits, and keep the day moving without losing the bigger picture.
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
            <StatCard label="Pending" value={String(counts.pending)} helper="Waiting on your decision" />
            <StatCard label="Confirmed" value={String(counts.confirmed)} helper="Ready for consultation" />
            <StatCard label="Completed" value={String(counts.completed)} helper="Finished visits" />
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
            title="No appointments"
            description={
              tab === "upcoming"
                ? "Your pending and confirmed consultations will show here."
                : "Completed and cancelled appointments will appear here."
            }
          />
        </div>
      ) : (
        <ul className="mx-auto w-full max-w-5xl space-y-3">
          {list.map((appointment) => {
            const patientName = appointment.patient_name ?? "Patient";
            const isConfirmed = appointment.status === "confirmed";
            const isPending = appointment.status === "pending";

            return (
              <li
                key={appointment.id}
                className={cn(
                  "rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
                  COL[appointment.status],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <YakapAvatar name={patientName} color="#0B4F71" size={40} />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">
                        {patientName}
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
                    <>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-mid"
                      onClick={() => openMeeting(appointment.id)}
                    >
                      <Video className="h-4 w-4" /> Open Meet
                    </Button>
                    <Link href={`/doctor/appointments/${appointment.id}`}> 
                      <Button
                        size="sm"
                        className="border-primary/20 bg-primary-light text-primary hover:bg-primary/20 hover:text-primary"
                      >
                        Notes
                      </Button>
                    </Link>
                    </>
                  ) : null}

                  {appointment.status === "completed" ? (
                    <Link href={`/doctor/appointments/${appointment.id}`}>
                      <Button
                        size="sm"
                        className="border-primary/20 bg-primary-light text-primary hover:bg-primary/20 hover:text-primary"
                      >
                        Notes
                      </Button>
                    </Link>
                  ) : null}

                  {isPending ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-mid"
                        disabled={busyId === appointment.id}
                        onClick={() =>
                          performAction(appointment.id, `/api/v1/appointments/${appointment.id}/decision`, {
                            action: "approve",
                          })
                        }
                      >
                        {busyId === appointment.id ? "Saving..." : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === appointment.id}
                        onClick={() =>
                          performAction(appointment.id, `/api/v1/appointments/${appointment.id}/decision`, {
                            action: "reject",
                          })
                        }
                      >
                        Decline
                      </Button>
                    </>
                  ) : null}

                  {appointment.status === "confirmed" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          performAction(appointment.id, `/api/v1/appointments/${appointment.id}/complete`)
                        }
                        title={canCompleteAppointment(appointment) ? undefined : "Available after the consultation ends"}
                        aria-disabled={!canCompleteAppointment(appointment)}
                        disabled={busyId === appointment.id || !canCompleteAppointment(appointment)}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger-light hover:text-danger"
                        disabled={busyId === appointment.id}
                        onClick={() =>
                          performAction(appointment.id, `/api/v1/appointments/${appointment.id}/cancel`)
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
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
