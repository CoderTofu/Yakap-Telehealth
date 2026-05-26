"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Users,
  Bell,
  UserRound,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  APPOINTMENTS,
  DOCTORS,
  PATIENTS,
  formatLongDate,
  getPatient,
} from "@/lib/dashboard-data";

// client-side: read authUser from localStorage
const NAV: NavItem[] = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: CalendarDays },
  { to: "/doctor/appointments", label: "Appointments", icon: ClipboardList },
  { to: "/doctor/patients", label: "Patients", icon: Users },
  { to: "/doctor/profile", label: "Profile", icon: UserRound },
  { to: "/doctor/notifications", label: "Notifications", icon: Bell },
];

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      setUser(raw ? JSON.parse(raw) : null);
    } catch (err) {
      setUser(null);
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-text-muted">Loading...</div>
      </div>
    );
  }

  const shellUser = { name: user.name, role: "doctor" as const };

  const today = APPOINTMENTS.filter(
    (appointment) =>
      appointment.doctorId === user.id && appointment.status === "confirmed",
  );

  const pending = APPOINTMENTS.filter(
    (appointment) =>
      appointment.doctorId === user.id && appointment.status === "pending",
  );

  const stats = [
    { label: "Today's Appointments", value: today.length, icon: CalendarDays },
    { label: "Total Patients", value: PATIENTS.length * 42, icon: Users },
    { label: "Pending Requests", value: pending.length, icon: ClipboardList },
    { label: "Completed This Month", value: 23, icon: CheckCircle2 },
  ];

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    try {
      // clear cookies set by login/register
      document.cookie =
        "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "authUser=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch (_) {}
    router.push("/");
  }

  return (
    <AppShell nav={NAV} user={shellUser} unread={3} onLogout={handleLogout}>
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-3xl text-text-primary">
            Welcome back, {user.name}
          </h2>
          <p className="text-sm text-text-secondary">
            {formatLongDate(new Date().toISOString())}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
              <div className="px-5 py-10 text-center text-sm text-text-secondary">
                No appointments today.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {today.map((appointment) => {
                  const patient = getPatient(appointment.patientId);

                  if (!patient) return null;

                  return (
                    <li
                      key={appointment.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="w-20 font-serif text-lg text-primary">
                        {appointment.time}
                      </div>
                      <YakapAvatar
                        name={patient.name}
                        color={patient.avatarColor}
                        size={40}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">
                          {patient.name}
                        </div>
                        <StatusBadge
                          status={appointment.status}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-mid"
                        onClick={() =>
                          appointment.meetUrl &&
                          window.open(appointment.meetUrl, "_blank")
                        }
                      >
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
              <div className="px-5 py-10 text-center text-sm text-text-secondary">
                No pending requests.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pending.map((appointment) => {
                  const patient = getPatient(appointment.patientId);

                  if (!patient) return null;

                  return (
                    <li key={appointment.id} className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <YakapAvatar
                          name={patient.name}
                          color={patient.avatarColor}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-text-primary">
                            {patient.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {appointment.time}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary-mid"
                        >
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
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
      </div>
    </AppShell>
  );
}
