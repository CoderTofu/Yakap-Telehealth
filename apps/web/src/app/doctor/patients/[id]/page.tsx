"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import { YakapAvatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type PatientProfile = {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  medical_history: string | null;
};

type AppointmentItem = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

type ConsultationNote = {
  id: string;
  diagnosis: string | null;
  subjective: string | null;
  prescription: string | null;
};

type ConsultationHistoryItem = {
  id: string;
  scheduled_at: string;
  note: ConsultationNote | null;
};

function calcAge(dob: string | null) {
  if (!dob) return "-";

  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "-";

  return String(Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function colorFromName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 35%)`;
}


export default function PatientDetail() {
  const params = useParams<Record<string, string | string[]>>();
  const idParam = params.id ?? params["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [history, setHistory] = useState<ConsultationHistoryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoadError("Patient not found.");
      setProfile(null);
      setHistory([]);
      return;
    }

    let mounted = true;

    async function fetchPatientData(patientId: string) {
      try {
        setLoadError(null);

        const profileResponse = await apiRequest<{ data: PatientProfile }>(
          `/api/v1/doctors/me/patients/${patientId}`,
        );

        const appointmentsResponse = await apiRequest<{ data: AppointmentItem[] }>(
          "/api/v1/appointments/me",
        );

        const completedAppointments = (appointmentsResponse.data ?? []).filter(
          (appointment) =>
            appointment.patient_id === patientId && appointment.status === "completed",
        );

        const notesByAppointment = await Promise.all(
          completedAppointments.map(async (appointment) => {
            try {
              const notesResponse = await apiRequest<{ data: ConsultationNote[] }>(
                `/api/v1/appointments/${appointment.id}/notes`,
              );

              return {
                appointmentId: appointment.id,
                notes: Array.isArray(notesResponse.data) ? notesResponse.data : [],
              };
            } catch (error) {
              console.error("failed to fetch consultation notes", error);
              return { appointmentId: appointment.id, notes: [] as ConsultationNote[] };
            }
          }),
        );

        const notesMap = new Map<string, ConsultationNote[]>(
          notesByAppointment.map((entry) => [entry.appointmentId, entry.notes]),
        );

        const nextHistory: ConsultationHistoryItem[] = completedAppointments.map((appointment) => {
          const notes = notesMap.get(appointment.id) ?? [];
          return {
            id: appointment.id,
            scheduled_at: appointment.scheduled_at,
            note: notes[0] ?? null,
          };
        });

        if (mounted) {
          setProfile(profileResponse.data ?? null);
          setHistory(nextHistory);
        }
      } catch (error) {
        if (mounted) {
          setProfile(null);
          setHistory([]);
          setLoadError(error instanceof Error ? error.message : "Failed to load patient profile");
        }
      }
    }

    void fetchPatientData(id);

    return () => {
      mounted = false;
    };
  }, [id]);

  const bmi = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm) return "-";
    return (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1);
  }, [profile]);

  if (loadError) {
    return <div className="text-center text-text-secondary">{loadError}</div>;
  }

  if (profile === null || history === null) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patient profile...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/doctor/patients" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to patients
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col items-center text-center">
            <YakapAvatar name={profile.name} color={colorFromName(profile.name)} size={80} />
            <h2 className="mt-3 font-serif text-2xl text-text-primary">{profile.name}</h2>
            <p className="text-sm text-text-secondary">{calcAge(profile.date_of_birth)} years · DOB {profile.date_of_birth ?? "-"}</p>
            <p className="text-sm text-text-muted">{profile.phone ?? "-"}</p>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-bg p-3">
              <dt className="text-[11px] uppercase tracking-wide text-text-muted">Weight</dt>
              <dd className="font-serif text-lg text-text-primary">{profile.weight_kg ?? "-"}<span className="text-xs"> kg</span></dd>
            </div>
            <div className="rounded-lg bg-bg p-3">
              <dt className="text-[11px] uppercase tracking-wide text-text-muted">Height</dt>
              <dd className="font-serif text-lg text-text-primary">{profile.height_cm ?? "-"}<span className="text-xs"> cm</span></dd>
            </div>
            <div className="rounded-lg bg-bg p-3">
              <dt className="text-[11px] uppercase tracking-wide text-text-muted">BMI</dt>
              <dd className="font-serif text-lg text-text-primary">{bmi}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-text-muted">Medical history</div>
            <p className="mt-1 text-sm text-text-primary">{profile.medical_history ?? "-"}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <header className="border-b border-border px-5 py-4">
            <h3 className="font-serif text-xl text-text-primary">Consultation history</h3>
          </header>
          {history.length === 0 ? (
            <EmptyState
              icon={ChevronDown}
              title="No past consultations"
              description="Completed appointments with notes will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => {
                const open = openId === h.id;
                return (
                  <li key={h.id}>
                    <button onClick={() => setOpenId(open ? null : h.id)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-text-muted">{formatDate(h.scheduled_at)}</div>
                        <div className="mt-1 text-sm font-medium text-text-primary">{h.note?.diagnosis ?? "No diagnosis recorded"}</div>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    </button>
                    {open && h.note && (
                      <div className="space-y-3 border-t border-border bg-bg/40 px-5 py-4 text-sm">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-text-muted">Subjective</div>
                          <p className="mt-1">{h.note.subjective ?? "-"}</p>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-text-muted">Prescription</div>
                          <p className="mt-1">{h.note.prescription ?? "-"}</p>
                        </div>
                      </div>
                    )}
                    {open && !h.note ? (
                      <div className="border-t border-border bg-bg/40 px-5 py-4 text-sm text-text-secondary">
                        No consultation note was recorded for this appointment.
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}