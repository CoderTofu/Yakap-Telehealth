"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pill,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { YakapAvatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

type CurrentUser = {
  id: string;
  name: string;
};

type AppointmentItem = {
  id: string;
  doctor_id: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  doctor_name?: string;
  video_room_url?: string | null;
};

type MedicalRecord = {
  id: string;
  diagnosis: string | null;
  scheduled_at: string;
  doctor_name: string;
  specialization: string | null;
};

type DoctorSummary = {
  id: string;
  name: string;
  specialization: string;
  avatar_url: string | null;
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

function colorFromName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 35%)`;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[] | null>(null);
  const [records, setRecords] = useState<MedicalRecord[] | null>(null);
  const [allDoctors, setAllDoctors] = useState<DoctorSummary[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [recs, setRecs] = useState<DoctorSummary[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      setUser(raw ? JSON.parse(raw) : null);
    } catch (err) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchDashboardData() {
      try {
        const [appointmentsJson, recordsJson, doctorsJson] = await Promise.all([
          apiRequest<{ data: AppointmentItem[] }>("/api/v1/appointments/me"),
          apiRequest<{ data: MedicalRecord[] }>("/api/v1/patients/me/records"),
          apiRequest<{ data: { items: DoctorSummary[] } }>("/api/v1/doctors", {}, { auth: false }),
        ]);

        if (mounted) {
          setAppointments(Array.isArray(appointmentsJson.data) ? appointmentsJson.data : []);
          setRecords(Array.isArray(recordsJson.data) ? recordsJson.data : []);
          setAllDoctors(Array.isArray(doctorsJson.data?.items) ? doctorsJson.data.items : []);
        }
      } catch (error) {
        console.error("failed to fetch patient dashboard data", error);
        if (mounted) {
          setAppointments([]);
          setRecords([]);
          setAllDoctors([]);
        }
      }
    }

    void fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const loading = user === null || appointments === null || records === null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const upcoming = appointments.filter(
    (appointment) =>
      (appointment.status === "confirmed" || appointment.status === "pending"),
  ).slice(0, 3);

  const recentRecords = records.slice(0, 3);

  const completedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "completed").length,
    [appointments],
  );

  const activePrescriptions = useMemo(
    () => records.filter((record) => !!record.diagnosis).length,
    [records],
  );

  const stats = [
    { label: "Total Appointments", value: appointments.length, icon: CalendarDays },
    { label: "Upcoming", value: upcoming.length, icon: ClipboardList },
    { label: "Completed", value: completedCount, icon: CheckCircle2 },
    { label: "Active Prescriptions", value: activePrescriptions, icon: Pill },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function handleAiSearch() {
    if (!symptoms.trim()) return;
    const searchTerms = symptoms
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matches = allDoctors
      .filter((doctor) => {
        const haystack = `${doctor.name} ${doctor.specialization}`.toLowerCase();
        return searchTerms.some((term) => haystack.includes(term));
      })
      .slice(0, 3);

    setRecs(matches.length > 0 ? matches : allDoctors.slice(0, 3));
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    router.push("/");
  }

  return (
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
          <Link href="/patient/doctors">Book a Consultation</Link>
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
              href="/patient/appointments"
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
              const doctorName = appointment.doctor_name ?? "Doctor";

              return (
                <li
                  key={appointment.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <YakapAvatar
                    name={doctorName}
                    color={colorFromName(doctorName)}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-text-primary">
                        {doctorName}
                      </span>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <div className="text-sm text-text-secondary">
                      {formatDate(appointment.scheduled_at)} · {formatTime(appointment.scheduled_at)}
                    </div>
                  </div>
                  {appointment.status === "confirmed" ? (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-mid"
                      onClick={async () => {
                        try {
                          const json = await apiRequest<{ data: { video_room_url: string } }>(
                            `/api/v1/appointments/${appointment.id}/meeting`,
                          );
                          if (json.data?.video_room_url) {
                            window.open(json.data.video_room_url, "_blank");
                          }
                        } catch (error) {
                          alert(error instanceof Error ? error.message : "Failed to open meeting");
                        }
                      }}
                    >
                      <Video className="h-4 w-4" /> Join
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/patient/appointments">Details</Link>
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
                    color={colorFromName(doctor.name)}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">
                      {doctor.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {doctor.specialization}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/patient/doctors/${doctor.id}`}>View</Link>
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
            href="/patient/records"
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
          {recentRecords.map((record) => {
            return (
              <li key={record.id} className="flex items-center gap-4 px-5 py-4">
                <YakapAvatar
                  name={record.doctor_name}
                  color={colorFromName(record.doctor_name)}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    {record.doctor_name}
                    {record.specialization ? ` · ${record.specialization}` : ""}
                  </div>
                  <div className="truncate text-sm text-text-secondary">
                    {record.diagnosis ?? "-"}
                  </div>
                </div>
                <div className="text-xs text-text-muted">
                  {formatDate(record.scheduled_at)}
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/patient/records">View</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
