"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, BadgeCheck, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { YakapAvatar } from "@/components/shared/avatar";
import { getDoctor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function buildWeek() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

const SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
];

export default function DoctorDetail() {
  //   const { id } = Route.useParams();
  //   const navigate = useNavigate();
  const doctor = getDoctor("d4");
  const week = buildWeek();
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!doctor)
    return (
      <div className="text-center text-text-secondary">Doctor not found.</div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/patient/doctors"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> Back to doctors
      </Link>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start gap-5">
          <YakapAvatar
            name={doctor.name}
            color={doctor.avatarColor}
            size={80}
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-2xl text-text-primary">
              {doctor.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                {doctor.specialty}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <BadgeCheck className="h-3.5 w-3.5" /> License {doctor.license}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <Award className="h-3.5 w-3.5" /> {doctor.experience} years
                experience
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {doctor.bio}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-text-muted">
              Consultation fee
            </div>
            <div className="font-serif text-2xl text-text-primary">
              ₱{doctor.fee.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="font-serif text-xl text-text-primary">
          Choose a date and time
        </h3>

        <div className="mt-5 grid grid-cols-7 gap-2">
          {week.map((d, i) => {
            const active = i === day;
            return (
              <button
                key={i}
                onClick={() => {
                  setDay(i);
                  setSlot(null);
                }}
                className={cn(
                  "rounded-lg border p-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface hover:border-primary-mid",
                )}
              >
                <div
                  className={cn(
                    "text-[11px] uppercase",
                    active ? "text-white/80" : "text-text-muted",
                  )}
                >
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="mt-1 font-serif text-xl">{d.getDate()}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SLOTS.map((s, i) => {
            const disabled = i % 4 === 3;
            const active = slot === s;
            return (
              <button
                key={s}
                disabled={disabled}
                onClick={() => setSlot(s)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-sm transition-colors",
                  disabled &&
                    "cursor-not-allowed border-border bg-muted text-text-muted line-through",
                  !disabled &&
                    !active &&
                    "border-border hover:border-primary-mid",
                  !disabled && active && "border-primary bg-primary text-white",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>

        <Button
          disabled={!slot}
          onClick={() => setConfirm(true)}
          className="mt-6 w-full bg-primary hover:bg-primary-mid"
        >
          Confirm Booking
        </Button>
      </section>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Confirm your booking
            </DialogTitle>
            <DialogDescription>
              Please review the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-bg p-4 text-sm">
            <div>
              <span className="text-text-muted">Doctor: </span>
              <span className="font-medium">{doctor.name}</span>
            </div>
            <div>
              <span className="text-text-muted">Date: </span>
              <span className="font-medium">
                {week[day].toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Time: </span>
              <span className="font-medium">{slot}</span>
            </div>
            <div>
              <span className="text-text-muted">Fee: </span>
              <span className="font-medium">
                ₱{doctor.fee.toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-mid"
              onClick={() => {
                setConfirm(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
