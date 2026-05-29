"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Camera } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { SPECIALTIES } from "@/lib/appConfig";

export default function DoctorProfile() {
  const [user, setUser] = useState<any | null>(null);
  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState<string | null>(null);
  const [license, setLicense] = useState<string | null>(null);
  const [yearsExp, setYearsExp] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      setUser(raw ? JSON.parse(raw) : null);
      void (async function load() {
        try {
          const json = await apiRequest<{ data: any }>("/api/v1/profile/me");
          const data = json.data;
          setUser((prev: any) => ({ ...(prev ?? {}), ...data }));
          setBio(data?.doctor_profile?.bio ?? "");
          setSpecialization(data?.doctor_profile?.specialization ?? "");
          setLicense(data?.doctor_profile?.license_number ?? "");
          setYearsExp(toNullableNumber(data?.doctor_profile?.years_exp));
          setFee(toNullableNumber(data?.doctor_profile?.consultation_fee));
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
        doctor_profile: {
          specialization: specialization ?? null,
          license_number: license ?? null,
          bio: bio ?? null,
          years_exp: yearsExp ?? null,
          consultation_fee: fee ?? null,
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
    <div className="mx-auto max-w-3xl">
      {isEditing ? (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-sm text-primary">
          Editing mode is on. Use Save Changes to apply updates or Cancel to discard edits.
        </div>
      ) : null}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mb-6">
            <h3 className="font-serif text-xl text-text-primary">Doctor Profile</h3>
            <p className="mt-1 text-sm text-text-secondary">
             Keep your professional details current for patients and bookings.
            </p>
          </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="group relative">
              <YakapAvatar name={user.name} color={user.avatarColor} size={80} />
              <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100">
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div>
              <h2 className="font-serif text-2xl text-text-primary">
                {user.name}
              </h2>
              <p className="text-sm text-text-secondary">{user.email}</p>
            </div>
          </div>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit profile
            </Button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Specialization</Label>
            {isEditing ? (
              <select
                value={specialization ?? ""}
                onChange={(e) => setSpecialization(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select specialization</option>
                {SPECIALTIES.map((s) => (
                  <option key={s.label} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <ProfileValue>
                {specialization ? labelFromSpecialty(specialization) : "Not set"}
              </ProfileValue>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>License number</Label>
            {isEditing ? (
              <Input value={license ?? ""} onChange={(e) => setLicense(e.target.value)} />
            ) : (
              <ProfileValue>{license ?? "Not set"}</ProfileValue>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Years of experience</Label>
            {isEditing ? (
              <Input
                type="number"
                value={yearsExp ?? ""}
                onChange={(e) => setYearsExp(toNullableNumber(e.target.value))}
              />
            ) : (
              <ProfileValue>{yearsExp ?? "Not set"}</ProfileValue>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Consultation fee (PHP)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={fee ?? ""}
                onChange={(e) => setFee(toNullableNumber(e.target.value))}
              />
            ) : (
              <ProfileValue>{fee !== null ? `₱${fee.toLocaleString()}` : "Not set"}</ProfileValue>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Bio</Label>
            <span className="text-xs text-text-muted">{bio.length}/500</span>
          </div>
          {isEditing ? (
            <Textarea
              rows={5}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          ) : (
            <ProfileValue>{bio?.trim() ? bio : "Not set"}</ProfileValue>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setIsEditing(false)}
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
            </>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Save profile changes?"
        description="This will update your doctor profile for patients and appointments."
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

function labelFromSpecialty(value: string) {
  return SPECIALTIES.find((s) => s.value === value)?.label ?? value;
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
