"use client";

import { useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Pill,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENTS,
  DOCTORS,
  PATIENTS,
  formatDate,
  getDoctor,
  type DoctorSummary,
} from "@/lib/dashboard-data";

const NAV: NavItem[] = [
  { to: "/patient/dashboard", label: "Dashboard", icon: CalendarDays },
  { to: "/patient/appointments", label: "Appointments", icon: ClipboardList },
  { to: "/patient/records", label: "Records", icon: FileText },
  { to: "/patient/profile", label: "Profile", icon: UserRound },
  { to: "/patient/notifications", label: "Notifications", icon: Bell },
];

export default function PatientDashboard() {
  const router = useRouter();
  const user = PATIENTS[0];
  const shellUser = { name: user.name, role: "patient" as const };
  const [symptoms, setSymptoms] = useState("");
  const [recs, setRecs] = useState<DoctorSummary[]>([]);

  const upcoming = APPOINTMENTS.filter(
    (appointment) =>
      appointment.patientId === user.id &&
      (appointment.status === "confirmed" || appointment.status === "pending"),
  ).slice(0, 3);

  const records = APPOINTMENTS.filter(
    (appointment) =>
      appointment.patientId === user.id && appointment.status === "completed",
  ).slice(0, 3);

  const stats = [
    { label: "Total Appointments", value: 12, icon: CalendarDays },
    { label: "Upcoming", value: upcoming.length, icon: ClipboardList },
    { label: "Completed", value: records.length + 6, icon: CheckCircle2 },
    { label: "Active Prescriptions", value: 2, icon: Pill },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function handleAiSearch() {
    if (!symptoms.trim()) return;
    setRecs(DOCTORS.slice(0, 2));
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    router.push("/");
  }

  return (
    <AppShell nav={NAV} user={shellUser} unread={2} onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl text-text-primary">
              {greeting}, {user.name.split(" ")[0]}
            </h2>
            <p className="text-sm text-text-secondary">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary-mid">
            <Link href="/register">Book a Consultation</Link>
          </Button>
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
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-serif text-xl text-text-primary">
                Upcoming appointments
              </h3>
              <Link
                href="/register"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </header>
            <ul className="divide-y divide-border">
              {upcoming.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-text-secondary">
                  No upcoming appointments.
                </li>
              )}
              {upcoming.map((appointment) => {
                const doctor = getDoctor(appointment.doctorId);

                if (!doctor) return null;

                return (
                  <li
                    key={appointment.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <YakapAvatar
                      name={doctor.name}
                      color={doctor.avatarColor}
                      size={42}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-text-primary">
                          {doctor.name}
                        </span>
                        <StatusBadge status={appointment.status} />
                      </div>
                      <div className="text-sm text-text-secondary">
                        {doctor.specialty} · {formatDate(appointment.date)} ·{" "}
                        {appointment.time}
                      </div>
                    </div>
                    {appointment.status === "confirmed" &&
                    appointment.meetUrl ? (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-mid"
                        onClick={() =>
                          window.open(appointment.meetUrl, "_blank")
                        }
                      >
                        <Video className="h-4 w-4" /> Join
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/register">Details</Link>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-mid" />
              <h3 className="font-serif text-xl text-text-primary">
                Not sure who to see?
              </h3>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Describe your symptoms and we&apos;ll suggest specialists.
            </p>
            <Textarea
              className="mt-3"
              rows={4}
              placeholder="e.g. mild chest tightness when climbing stairs..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
            <Button
              className="mt-3 w-full bg-primary hover:bg-primary-mid"
              onClick={handleAiSearch}
            >
              Find Doctors
            </Button>
            {recs.length > 0 && (
              <ul className="mt-4 space-y-2">
                {recs.map((doctor) => (
                  <li
                    key={doctor.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <YakapAvatar
                      name={doctor.name}
                      color={doctor.avatarColor}
                      size={34}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {doctor.name}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {doctor.specialty}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/register">View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-serif text-xl text-text-primary">
              Recent medical records
            </h3>
            <Link
              href="/register"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {records.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-text-secondary">
                No records yet.
              </li>
            )}
            {records.map((record) => {
              const doctor = getDoctor(record.doctorId);

              if (!doctor) return null;

              return (
                <li
                  key={record.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <YakapAvatar
                    name={doctor.name}
                    color={doctor.avatarColor}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {doctor.name} · {doctor.specialty}
                    </div>
                    <div className="truncate text-sm text-text-secondary">
                      {record.notes?.diagnosis ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted">
                    {formatDate(record.date)}
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/register">View</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
