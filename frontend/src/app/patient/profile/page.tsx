"use client";

import { Camera } from "lucide-react";
import { useState, useEffect } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { apiRequest } from "@/lib/api-client";

export default function PatientProfile() {
  const [user, setUser] = useState<any | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      const parsed = raw ? JSON.parse(raw) : null;
      setUser(parsed);
      void (async function load() {
        try {
          const json = await apiRequest<{ data: any }>("/api/v1/profile/me");
          const data = json.data;
          setUser((prev: any) => ({ ...(prev ?? {}), ...data }));
          setDob(toDateInputValue(data?.patient_profile?.date_of_birth));
          setPhone(data?.phone ?? null);
          setWeight(data?.patient_profile?.weight_kg ?? null);
          setHeight(data?.patient_profile?.height_cm ?? null);
          setHistory(data?.patient_profile?.medical_history ?? null);
        } catch (err) {
          // ignore
        }
      })();
    } catch (err) {
      setUser(null);
    }
  }, []);
  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        name: user.name,
        phone: phone ?? null,
        patient_profile: {
          date_of_birth: toDateInputValue(dob),
          weight_kg: weight ?? null,
          height_cm: height ?? null,
          medical_history: history ?? null,
        },
      };
      const json = await apiRequest<{ data: any }>("/api/v1/profile/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser((prev: any) => ({ ...(prev ?? {}), ...json.data }));
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function requestSave() {
    setSaveConfirmOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl">
      {isEditing ? (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-sm text-primary">
          Editing mode is on. Use Save Changes to apply updates or Cancel to discard edits.
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl text-text-primary">Patient Profile</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Keep your personal and health details up to date.
            </p>
          </div>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit profile
            </Button>
          ) : null}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <YakapAvatar name={user.name} color={user.avatarColor} size={72} />
          <div>
            <div className="text-sm font-medium text-text-primary">{user.name}</div>
            <div className="text-sm text-text-secondary">{user.email}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              {isEditing ? (
                <Input
                  value={user.name}
                  onChange={(e) =>
                    setUser((u: any) => ({ ...(u ?? {}), name: e.target.value }))
                  }
                />
              ) : (
                <ProfileValue>{user.name}</ProfileValue>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <ProfileValue>{user.email}</ProfileValue>
            </div>
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              {isEditing ? (
                <Input
                  value={phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                />
              ) : (
                <ProfileValue>{phone ?? "Not set"}</ProfileValue>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={dob ?? ""}
                  onChange={(e) => setDob(e.target.value)}
                />
              ) : (
                <ProfileValue>{formatDate(dob)}</ProfileValue>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={weight ?? ""}
                  onChange={(e) => setWeight(toNullableNumber(e.target.value))}
                />
              ) : (
                <ProfileValue>{weight ?? "Not set"}</ProfileValue>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Height (cm)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={height ?? ""}
                  onChange={(e) => setHeight(toNullableNumber(e.target.value))}
                />
              ) : (
                <ProfileValue>{height ?? "Not set"}</ProfileValue>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Medical history</Label>
              {isEditing ? (
                <Textarea
                  rows={6}
                  value={history ?? ""}
                  onChange={(e) => setHistory(e.target.value)}
                />
              ) : (
                <ProfileValue>{history?.trim() ? history : "Not set"}</ProfileValue>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-mid"
              disabled={saving}
              onClick={requestSave}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Save profile changes?"
        description="This will update your profile information for doctors and appointment records."
        confirmLabel="Save Changes"
        confirmingLabel="Saving..."
        isConfirming={saving}
        onConfirm={async () => {
          setSaveConfirmOpen(false);
          await handleSave();
        }}
      />
    </div>
  );
}

function toDateInputValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function ProfileValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-9 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-text-primary">
      {children}
    </div>
  );
}