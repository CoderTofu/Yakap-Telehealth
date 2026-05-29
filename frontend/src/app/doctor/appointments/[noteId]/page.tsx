"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save, Edit2, Sparkles, FileText, Stethoscope, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { YakapAvatar } from "@/components/shared/avatar";

type Note = {
  id: string;
  appointment_id: string;
  subjective: string | null;
  diagnosis: string | null;
  prescription: string | null;
  created_at: string;
};

type AppointmentItem = {
  id: string;
  patient_name?: string;
  scheduled_at: string;
  status: string;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

export default function AppointmentNotesPage() {
  const params = useParams() as { noteId?: string };
  const router = useRouter();
  const appointmentId = params.noteId ?? "";

  const [notes, setNotes] = useState<Note[] | null>(null);
  const [appointment, setAppointment] = useState<AppointmentItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [subjective, setSubjective] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");

  useEffect(() => {
    if (!appointmentId) return;

    let mounted = true;

    async function load() {
      try {
        const [notesJson, apptsJson] = await Promise.all([
          apiRequest<{ data: Note[] }>(`/api/v1/appointments/${appointmentId}/notes`),
          apiRequest<{ data: AppointmentItem[] }>(`/api/v1/appointments/me`),
        ]);

        if (!mounted) return;

        setNotes(Array.isArray(notesJson.data) ? notesJson.data : []);

        const appt = Array.isArray(apptsJson.data)
          ? apptsJson.data.find((a) => a.id === appointmentId) ?? null
          : null;

        setAppointment(appt);

        const latest = (notesJson.data ?? [])[0];
        if (latest) {
          setSubjective(latest.subjective ?? "");
          setDiagnosis(latest.diagnosis ?? "");
          setPrescription(latest.prescription ?? "");
        }
      } catch (err) {
        console.error("failed to load notes", err);
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
  const canEdit = appointment?.status === "completed";

  async function handleSave() {
    setBusy(true);
    try {
      if (!canEdit) {
        throw new Error("Consultation notes can only be added to completed appointments");
      }
      const requestPath = editingNoteId
        ? `/api/v1/appointments/${appointmentId}/notes/${editingNoteId}`
        : `/api/v1/appointments/${appointmentId}/notes`;

      await apiRequest(requestPath, {
        method: editingNoteId ? "PATCH" : "POST",
        body: JSON.stringify({ subjective, diagnosis, prescription }),
      });

      const json = await apiRequest<{ data: Note[] }>(`/api/v1/appointments/${appointmentId}/notes`);
      setNotes(Array.isArray(json.data) ? json.data : []);
      setEditingNoteId(null);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setBusy(false);
    }
  }

  function beginCreate() {
    setEditingNoteId(null);
    setSubjective("");
    setDiagnosis("");
    setPrescription("");
    setIsEditing(true);
  }

  function beginUpdate(note: Note) {
    setEditingNoteId(note.id);
    setSubjective(note.subjective ?? "");
    setDiagnosis(note.diagnosis ?? "");
    setPrescription(note.prescription ?? "");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditingNoteId(null);
    if (latest) {
      setSubjective(latest.subjective ?? "");
      setDiagnosis(latest.diagnosis ?? "");
      setPrescription(latest.prescription ?? "");
    } else {
      setSubjective("");
      setDiagnosis("");
      setPrescription("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/doctor/appointments" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to appointments
        </Link>
      </div>
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="bg-linear-to-br from-primary-light via-surface to-surface px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <YakapAvatar name={appointment?.patient_name ?? "Patient"} color="#0B4F71" size={56} />
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Consultation notes
                </div>
                <div className="mt-3 text-2xl font-serif text-text-primary md:text-3xl">
                  {appointment?.patient_name ?? "Patient"}
                </div>
                {appointment?.scheduled_at ? (
                  <div className="mt-1 text-sm text-text-secondary">{formatDateTime(appointment.scheduled_at)}</div>
                ) : null}
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary-light px-4 py-3 text-sm text-primary">
              Editing mode is on. Use Save Changes to apply updates or Cancel to discard edits.
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniCard icon={FileText} label="Latest note" value={latest ? "Available" : "None yet"} helper="Current consultation record" />
        <MiniCard icon={Stethoscope} label="Status" value={appointment?.status ?? "unknown"} helper="Editing unlocked after completion" />
        <MiniCard icon={Edit2} label="Mode" value={isEditing ? "Editing" : "Viewing"} helper="One save button per page" />
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {!canEdit ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-text-muted">
            Consultation notes can only be added after the appointment is completed. Current status: <span className="font-medium text-text-primary capitalize">{appointment?.status ?? "unknown"}</span>.
          </div>
        ) : !isEditing ? (
          <div className="space-y-4 text-sm">
            {latest ? (
              <>
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-text-muted">Subjective findings</div>
                  <p className="mt-2 leading-6 text-text-primary">{latest.subjective ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-text-muted">Diagnosis</div>
                  <p className="mt-2 leading-6 text-text-primary">{latest.diagnosis ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-text-muted">Prescription</div>
                  <p className="mt-2 leading-6 text-text-primary">{latest.prescription ?? "-"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => beginUpdate(latest)} className="bg-primary hover:bg-primary-mid">
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">No consultation note yet</div>
                  <p className="mt-1 text-text-secondary">
                    Add the first note for this completed appointment.
                  </p>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary-mid" disabled={!canEdit || busy} onClick={beginCreate}>
                  <Save className="h-4 w-4" /> Add Note
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-text-muted">Subjective findings</div>
              <Textarea className="mt-2 min-h-32 bg-surface" value={subjective} onChange={(e) => setSubjective(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-text-muted">Diagnosis</div>
              <Textarea className="mt-2 min-h-32 bg-surface" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-text-muted">Prescription</div>
              <Textarea className="mt-2 min-h-32 bg-surface" value={prescription} onChange={(e) => setPrescription(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary-mid"
                disabled={busy || !canEdit}
                onClick={handleSave}
              >
                <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-text-primary capitalize">{value}</div>
      <div className="mt-1 text-sm text-text-secondary">{helper}</div>
    </div>
  );
}
