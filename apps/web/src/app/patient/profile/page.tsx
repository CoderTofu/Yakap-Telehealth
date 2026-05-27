"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { useState, useEffect } from "react";

export default function PatientProfile() {
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
            <Input defaultValue={user.name} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              readOnly
              defaultValue={user.email}
              className="bg-muted text-text-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input defaultValue="+63 917 123 4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Date of birth</Label>
            <Input type="date" defaultValue="1990-03-15" />
          </div>
        </div>
        <Button className="mt-6 bg-primary hover:bg-primary-mid">
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
            <Input type="number" defaultValue={72} />
          </div>
          <div className="space-y-1.5">
            <Label>Height (cm)</Label>
            <Input type="number" defaultValue={175} />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label>Medical history</Label>
          <Textarea
            rows={6}
            defaultValue="No known allergies. Mild hypertension."
          />
        </div>
        <Button className="mt-6 bg-primary hover:bg-primary-mid">
          Save Changes
        </Button>
      </section>
    </div>
  );
}