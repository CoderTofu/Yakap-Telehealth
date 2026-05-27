"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
            title="No appointments"
            description={
              tab === "upcoming"
                ? "Your pending and confirmed consultations will show here."
                : "Completed and cancelled appointments will appear here."
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((appointment) => {
            const patientName = appointment.patient_name ?? "Patient";

            return (
              <li
                key={appointment.id}
                className={cn(
                  "rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-4",
                  COL[appointment.status],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <YakapAvatar name={patientName} color="#0B4F71" size={48} />
                    <div>
                      <div className="font-medium text-text-primary">
                        {patientName}
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

                  {appointment.status === "pending" ? (
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
