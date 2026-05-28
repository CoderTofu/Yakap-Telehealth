"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Users,
  Video,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { YakapAvatar } from "@/components/shared/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

export default function DoctorDashboard() {
  const [user, setUser] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[] | null>(null);
  const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    patientName: string;
    action: "approve" | "reject";
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      setUser(raw ? JSON.parse(raw) : null);
    } catch (err) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    async function load() {
      try {
        const json = await apiRequest<{ data: any[] }>("/api/v1/appointments/me");
        if (!mounted) return;
        setAppointments(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        console.error("failed to fetch doctor appointments", err);
        if (mounted) setAppointments([]);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [user]);

  const loading = user === null || appointments === null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...
        </div>
      </div>
    );
  }

  const today = appointments.filter((a) => {
    if (a.status !== "confirmed") return false;
    try {
      const d = new Date(a.scheduled_at);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  });

  const pending = appointments.filter((a) => a.status === "pending");

  const uniquePatientIds = Array.from(new Set(appointments.map((a) => a.patient_id)));

  const completedThisMonth = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    const completedAt = a.completed_at ? new Date(a.completed_at) : null;
    if (!completedAt) return false;
    const now = new Date();
    return completedAt.getFullYear() === now.getFullYear() && completedAt.getMonth() === now.getMonth();
  }).length;

  function formatLongDate(date: string | Date) {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
  }

  async function confirmDecision() {
    if (!pendingDecision) return;

    setDecisionBusyId(pendingDecision.id);
    try {
      await apiRequest(`/api/v1/appointments/${pendingDecision.id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ action: pendingDecision.action }),
      });
      const json = await apiRequest<{ data: any[] }>("/api/v1/appointments/me");
      setAppointments(Array.isArray(json.data) ? json.data : []);
      setPendingDecision(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${pendingDecision.action}`);
    } finally {
      setDecisionBusyId(null);
    }
  }

  function promptDecision(appointment: any, action: "approve" | "reject") {
    setPendingDecision({
      id: appointment.id,
      patientName: appointment.patient_name ?? "Patient",
      action,
    });
  }

  const stats = [
    { label: "Today's Appointments", value: today.length, icon: CalendarDays },
    { label: "Total Patients", value: uniquePatientIds.length, icon: Users },
    { label: "Pending Requests", value: pending.length, icon: ClipboardList },
    { label: "Completed This Month", value: completedThisMonth, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl text-text-primary">Welcome back, {user.name}</h2>
        <p className="text-sm text-text-secondary">{formatLongDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-text-muted">
                {label}
              </span>
              <Icon className="h-4 w-4 text-text-muted" />
            </div>
            <div className="mt-2 font-serif text-3xl text-text-primary">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:col-span-2">
          <header className="border-b border-border px-5 py-4">
            <h3 className="font-serif text-xl text-text-primary">
              Today's schedule
            </h3>
          </header>
          {today.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-secondary">No appointments today.</div>
          ) : (
            <ul className="divide-y divide-border">
              {today.map((appointment) => {
                const patientName = appointment.patient_name ?? "Patient";
                const meetUrl = appointment.video_room_url ?? appointment.video_room_url;
                const time = new Date(appointment.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });

                return (
                  <li key={appointment.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-28 font-serif text-lg text-primary">{time}</div>
                    <YakapAvatar name={patientName} color={"#0B4F71"} size={40} />
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">{patientName}</div>
                      <StatusBadge status={appointment.status} className="mt-1" />
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary-mid" onClick={() => meetUrl && window.open(meetUrl, "_blank") }>
                      <Video className="h-4 w-4" /> Join
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <header className="border-b border-border px-5 py-4">
            <h3 className="font-serif text-xl text-text-primary">
              Pending requests
            </h3>
          </header>
          {pending.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-secondary">No pending requests.</div>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((appointment) => {
                const patientName = appointment.patient_name ?? "Patient";
                const time = new Date(appointment.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });

                return (
                  <li key={appointment.id} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <YakapAvatar name={patientName} color={"#0B4F71"} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-text-primary">{patientName}</div>
                        <div className="text-xs text-text-muted">{time}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1 bg-primary hover:bg-primary-mid" onClick={() => promptDecision(appointment, "approve")}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => promptDecision(appointment, "reject")}>
                        Decline
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border p-3 text-center">
            <Link
              href="/register"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all appointments
            </Link>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDecision(null);
        }}
        title={pendingDecision?.action === "reject" ? "Decline request?" : "Confirm request?"}
        description={
          pendingDecision?.action === "reject"
            ? `This will decline ${pendingDecision?.patientName ?? "this patient"}'s appointment request.`
            : `This will confirm ${pendingDecision?.patientName ?? "this patient"}'s appointment request.`
        }
        confirmLabel={pendingDecision?.action === "reject" ? "Decline" : "Confirm"}
        confirmingLabel={pendingDecision?.action === "reject" ? "Declining..." : "Confirming..."}
        cancelLabel="Go Back"
        isConfirming={decisionBusyId === pendingDecision?.id}
        intent={pendingDecision?.action === "reject" ? "destructive" : "default"}
        onConfirm={confirmDecision}
      />
    </div>
  );
}
