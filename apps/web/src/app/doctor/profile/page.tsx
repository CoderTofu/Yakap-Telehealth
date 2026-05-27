"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { SPECIALTIES } from "@/lib/appConfig";

export default function DoctorProfile() {
  const [user, setUser] = useState<any | null>(null);
  const [bio, setBio] = useState(
    "Board-certified cardiologist with deep experience in preventive heart care and arrhythmia management.",
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      setUser(raw ? JSON.parse(raw) : null);
      console.log(raw);
    } catch (err) {
      setUser(null);
    }
  }, []);
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {SPECIALTIES.map((s) => (
                <option key={s.label} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>License number</Label>
            <Input defaultValue="PRC-0123456" />
          </div>
          <div className="space-y-1.5">
            <Label>Years of experience</Label>
            <Input type="number" defaultValue={12} />
          </div>
          <div className="space-y-1.5">
            <Label>Consultation fee (PHP)</Label>
            <Input type="number" defaultValue={1500} />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Bio</Label>
            <span className="text-xs text-text-muted">{bio.length}/500</span>
          </div>
          <Textarea
            rows={5}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <Button className="mt-6 bg-primary hover:bg-primary-mid">
          Save Changes
        </Button>
      </section>
    </div>
  );
}
