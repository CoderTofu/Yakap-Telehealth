"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { YakapAvatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

type Note = {
  id: string;
  appointment_id: string;
  subjective: string | null;
  diagnosis: string | null;
  prescription: string | null;
  created_at: string;
};

export default function PatientAppointmentNotes() {
  const params = useParams() as { noteId?: string };
  const router = useRouter();
  const appointmentId = params.noteId ?? "";

  const [notes, setNotes] = useState<Note[] | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    let mounted = true;

    async function load() {
      try {
        const [notesJson, apptsJson] = await Promise.all([
          apiRequest<{ data: Note[] }>(`/api/v1/appointments/${appointmentId}/notes`),
          apiRequest<{ data: any[] }>(`/api/v1/appointments/me`),
        ]);

        if (!mounted) return;
        setNotes(Array.isArray(notesJson.data) ? notesJson.data : []);
        const appt = Array.isArray(apptsJson.data)
          ? apptsJson.data.find((a) => a.id === appointmentId) ?? null
          : null;
        setAppointmentStatus(appt?.status ?? null);
      } catch (err) {
        console.error("failed to load patient notes", err);
        setNotes([]);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  if (!appointmentId) return <div>Invalid appointment</div>;

  if (notes === null) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notes...
        </div>
      </div>
    );
  }

  const latest = notes[0] ?? null;

  if (appointmentStatus !== "completed") {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">
        Consultation notes are only available after the appointment is completed. Current status: <span className="font-medium text-text-primary">{appointmentStatus ?? "unknown"}</span>
        <div className="mt-4">
          <Button onClick={() => router.back()} size="sm" variant="outline">Back</Button>
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">
        No consultation notes found for this appointment.
        <div className="mt-4">
          <Button onClick={() => router.back()} size="sm" variant="outline">Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">Subjective findings</div>
          <p className="mt-1 text-text-primary">{latest.subjective ?? "-"}</p>
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Diagnosis</div>
          <p className="mt-1 text-text-primary">{latest.diagnosis ?? "-"}</p>
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Prescription</div>
          <p className="mt-1 text-text-primary">{latest.prescription ?? "-"}</p>
        </div>
      </div>
      <div>
        <Button onClick={() => router.back()} size="sm" variant="outline">Back</Button>
      </div>
    </div>
  );
}
