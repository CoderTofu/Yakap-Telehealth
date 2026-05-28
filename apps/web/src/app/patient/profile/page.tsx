"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function PatientProfile() {
  const [user, setUser] = useState<any | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          setDob(data?.patient_profile?.date_of_birth ?? null);
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
          date_of_birth: dob ?? null,
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
      alert("Profile updated");
      setConfirmOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="font-serif text-xl text-text-primary">Personal info</h3>
        <div className="mt-5 flex items-center gap-4">
          <div className="group relative">
            <YakapAvatar name={user.name} color={user.avatarColor} size={72} />
            <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-5 w-5" />
            </button>
          </div>
          <div className="text-sm text-text-secondary">
            Upload a photo so doctors can recognize you.
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={user.name} onChange={(e) => setUser((u: any) => ({ ...(u ?? {}), name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              readOnly
              value={user.email}
              className="bg-muted text-text-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date of birth</Label>
            <Input type="date" value={dob ?? ""} onChange={(e) => setDob(e.target.value)} />
          </div>
        </div>
        <Button className="mt-6 bg-primary hover:bg-primary-mid" onClick={() => setConfirmOpen(true)}>
          Save Changes
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="font-serif text-xl text-text-primary">Health details</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Helps doctors provide more accurate care.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Weight (kg)</Label>
            <Input type="number" value={weight ?? ""} onChange={(e) => setWeight(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Height (cm)</Label>
            <Input type="number" value={height ?? ""} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label>Medical history</Label>
          <Textarea rows={6} value={history ?? ""} onChange={(e) => setHistory(e.target.value)} />
        </div>
        <div className="mt-6">
          <Button className="bg-primary hover:bg-primary-mid" disabled={saving} onClick={() => setConfirmOpen(true)}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </section>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save profile changes?"
        description="This will update your personal and health details."
        confirmLabel="Save Changes"
        confirmingLabel="Saving..."
        isConfirming={saving}
        onConfirm={handleSave}
      />
    </div>
  );
}