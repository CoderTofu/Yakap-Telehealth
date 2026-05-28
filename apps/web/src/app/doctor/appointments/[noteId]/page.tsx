"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save, Edit2, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { kind: "create" }
    | { kind: "update"; noteId: string }
    | { kind: "delete"; noteId: string }
    | null
  >(null);

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

  async function handleCreate() {
    setBusy(true);
    try {
      if (!canEdit) {
        throw new Error("Consultation notes can only be added to completed appointments");
      }
      await apiRequest(`/api/v1/appointments/${appointmentId}/notes`, {
        method: "POST",
        body: JSON.stringify({ subjective, diagnosis, prescription }),
      });
      // reload
      const json = await apiRequest<{ data: Note[] }>(`/api/v1/appointments/${appointmentId}/notes`);
      setNotes(Array.isArray(json.data) ? json.data : []);
      setEditingNoteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(noteId: string) {
    setBusy(true);
    try {
      if (!canEdit) {
        throw new Error("Consultation notes can only be edited for completed appointments");
      }
      await apiRequest(`/api/v1/appointments/${appointmentId}/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify({ subjective, diagnosis, prescription }),
      });
      const json = await apiRequest<{ data: Note[] }>(`/api/v1/appointments/${appointmentId}/notes`);
      setNotes(Array.isArray(json.data) ? json.data : []);
      setEditingNoteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update note");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(noteId: string) {
    setBusy(true);
    try {
      if (!canEdit) {
        throw new Error("Consultation notes can only be deleted for completed appointments");
      }
      await apiRequest(`/api/v1/appointments/${appointmentId}/notes/${noteId}`, {
        method: "DELETE",
      });
      const json = await apiRequest<{ data: Note[] }>(`/api/v1/appointments/${appointmentId}/notes`);
      setNotes(Array.isArray(json.data) ? json.data : []);
      setEditingNoteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;

    if (pendingAction.kind === "create") {
      await handleCreate();
    } else if (pendingAction.kind === "update") {
      await handleUpdate(pendingAction.noteId);
    } else if (pendingAction.kind === "delete") {
      await handleDelete(pendingAction.noteId);
    }

    setConfirmOpen(false);
    setPendingAction(null);
  }

  function promptCreate() {
    setPendingAction({ kind: "create" });
    setConfirmOpen(true);
  }

  function promptUpdate(noteId: string) {
    setPendingAction({ kind: "update", noteId });
    setConfirmOpen(true);
  }

  function promptDelete(noteId: string) {
    setPendingAction({ kind: "delete", noteId });
    setConfirmOpen(true);
  }

  const confirmTitle =
    pendingAction?.kind === "delete"
      ? "Delete consultation note?"
      : pendingAction?.kind === "update"
        ? "Save consultation note changes?"
        : "Add consultation note?";

  const confirmDescription =
    pendingAction?.kind === "delete"
      ? "This will permanently delete the consultation note and cannot be undone."
      : pendingAction?.kind === "update"
        ? "This will save the edited consultation note for the completed appointment."
        : "This will create a consultation note for the completed appointment.";

  const confirmLabel =
    pendingAction?.kind === "delete"
      ? "Delete Note"
      : pendingAction?.kind === "update"
        ? "Save"
        : "Add Note";

  const confirmingLabel =
    pendingAction?.kind === "delete" ? "Deleting..." : "Saving...";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <YakapAvatar name={appointment?.patient_name ?? "Patient"} color="#0B4F71" size={48} />
          <div>
            <div className="text-lg font-medium text-text-primary">
              {appointment?.patient_name ?? "Patient"}
            </div>
            {appointment?.scheduled_at ? (
              <div className="text-xs text-text-muted mt-1">{formatDateTime(appointment.scheduled_at)}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        {!canEdit ? (
          <div className="text-sm text-text-muted">
            Consultation notes can only be added after the appointment is completed. Current status: <span className="font-medium text-text-primary">{appointment?.status ?? "unknown"}</span>.
          </div>
        ) : latest && !editingNoteId ? (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Subjective findings</div>
              <p className="mt-1 text-text-primary">{latest.subjective ?? "-"}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Diagnosis</div>
              <p className="mt-1 text-text-primary">{latest.diagnosis ?? "-"}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Prescription</div>
              <p className="mt-1 text-text-primary">{latest.prescription ?? "-"}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => {
                setEditingNoteId(latest.id);
                setSubjective(latest.subjective ?? "");
                setDiagnosis(latest.diagnosis ?? "");
                setPrescription(latest.prescription ?? "");
              }}>
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="text-danger hover:bg-danger-light hover:text-danger" onClick={() => promptDelete(latest.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Subjective findings</div>
              <Textarea value={subjective} onChange={(e) => setSubjective(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Diagnosis</div>
              <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Prescription</div>
              <Textarea value={prescription} onChange={(e) => setPrescription(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="flex gap-2">
              {editingNoteId ? (
                <Button size="sm" className="bg-primary hover:bg-primary-mid" disabled={busy || !canEdit} onClick={() => promptUpdate(editingNoteId)}>
                  <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save"}
                </Button>
              ) : (
                <Button size="sm" className="bg-primary hover:bg-primary-mid" disabled={busy || !canEdit} onClick={() => promptCreate()}>
                  <Save className="h-4 w-4" /> {busy ? "Saving..." : "Add Note"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => {
                // cancel editing or go back
                if (editingNoteId) {
                  setEditingNoteId(null);
                  // restore latest values
                  if (latest) {
                    setSubjective(latest.subjective ?? "");
                    setDiagnosis(latest.diagnosis ?? "");
                    setPrescription(latest.prescription ?? "");
                  }
                } else {
                  router.back();
                }
              }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingAction(null);
          }
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        confirmingLabel={confirmingLabel}
        intent={pendingAction?.kind === "delete" ? "destructive" : "default"}
        isConfirming={busy}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
