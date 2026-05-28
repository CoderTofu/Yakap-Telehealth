"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  experience: number;
  license: string;
  fee: number;
  availableDays: string[];
  avatarColor: string;
};

type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

type DoctorAvailability = {
  doctor_id: string;
  from: string;
  to: string;
  slots: AvailabilitySlot[];
};

function formatDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatDayNumber(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "Asia/Manila" }).format(
      date,
    ),
  );
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila"
  })
}

function buildAvailabilityDays(fromIso: string, toIso: string) {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  const days: Date[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return days;
  }

  const MANILA_OFFSET = 8 * 60 * 60 * 1000;
  const sManila = new Date(start.getTime() + MANILA_OFFSET);
  const eManila = new Date(end.getTime() + MANILA_OFFSET);

  let cursor = new Date(
    Date.UTC(sManila.getUTCFullYear(), sManila.getUTCMonth(), sManila.getUTCDate()),
  );

  const endKey = [
    eManila.getUTCFullYear(),
    String(eManila.getUTCMonth() + 1).padStart(2, "0"),
    String(eManila.getUTCDate()).padStart(2, "0"),
  ].join("-");

  while (formatDateKey(cursor) <= endKey) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export default function DoctorDetail() {
  const params = useParams<Record<string, string | string[]>>();
  const idParam = params.id ?? params["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailability | null>(
    null,
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const availableDays = availability
    ? buildAvailabilityDays(availability.from, availability.to)
    : [];

  const slotsForSelectedDay = availability
    ? availability.slots.filter((entry) => {
        const slotDate = formatDateKey(new Date(entry.starts_at));
        return slotDate === selectedDateKey;
      })
    : [];

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    async function fetchDoctors() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        const doc_url = `${apiBase}/api/v1/doctors/${id}`;
        const doc_res = await fetch(doc_url);
        const doc_json = await doc_res.json();
        const doc_data = doc_json?.data ?? doc_json?.item ?? null;

        const doc_avail_url = `${apiBase}/api/v1/doctors/${id}/availability`;
        const doc_avail_res = await fetch(doc_avail_url);
        const doc_avail_json = await doc_avail_res.json();
        const doc_avail_data =
          doc_avail_json?.data ?? doc_avail_json?.item ?? null;

        if (
          mounted &&
          doc_data &&
          typeof doc_data === "object" &&
          !Array.isArray(doc_data)
        ) {
          setDoctor({
            id: String(doc_data.id ?? id),
            name: String(doc_data.name ?? "Unknown doctor"),
            specialty: String(
              doc_data.specialization ?? doc_data.specialty ?? "",
            ),
            bio: String(doc_data.bio ?? ""),
            experience: Number(doc_data.years_exp ?? doc_data.experience ?? 0),
            license: String(doc_data.license_number ?? doc_data.license ?? ""),
            fee: Number(doc_data.consultation_fee ?? doc_data.fee ?? 0),
            availableDays: Array.isArray(doc_data.availableDays)
              ? doc_data.availableDays
              : [],
            avatarColor: String(doc_data.avatarColor ?? "#0B4F71"),
          });
        }

        if (
          mounted &&
          doc_avail_data &&
          typeof doc_avail_data === "object" &&
          !Array.isArray(doc_avail_data)
        ) {
          const nextAvailability = doc_avail_data as DoctorAvailability;
          setAvailability(nextAvailability);

          if (!selectedDateKey) {
            const firstAvailableDay = nextAvailability.slots[0]
              ? formatDateKey(new Date(nextAvailability.slots[0].starts_at))
              : null;
            setSelectedDateKey(firstAvailableDay);
          }
        }
      } catch (err) {
        // swallow and keep empty list (UI will show 0 results)
        console.error("failed to fetch doctor", err);
      }
    }
    fetchDoctors();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!doctor)
    return (
      <div className="text-center text-text-secondary">Doctor not found.</div>
    );

  const selectedDay =
    availableDays.find((day) => formatDateKey(day) === selectedDateKey) ??
    availableDays[0] ??
    null;

  const handleSubmit = async () => {
    if (!slot) return;
    setIsSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      if (!apiBase) throw new Error("API URL not configured");

      const durationMinutes = Math.max(
        1,
        Math.round(
          (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) /
            60000,
        ),
      );

      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      if (!token) {
        // redirect to login if not authenticated
        router.push("/login");
        return;
      }

      const resp = await fetch(`${apiBase}/api/v1/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_id: doctor.id,
          scheduled_at: slot.starts_at,
          duration_minutes: durationMinutes,
        }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        const msg = json?.error?.message ?? json?.message ?? "Failed to create appointment";
        throw new Error(msg);
      }

      // Success: close dialog and go to appointments
      setConfirm(false);
      router.push("/patient/appointments");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  }
  

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

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {availableDays.map((day) => {
            const key = formatDateKey(day);
            const active = key === selectedDateKey;
            const hasSlots = availability
              ? availability.slots.some(
                  (entry) => formatDateKey(new Date(entry.starts_at)) === key,
                )
              : false;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedDateKey(key);
                  setSlot(null);
                }}
                className={cn(
                  "rounded-lg border p-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary text-white"
                    : hasSlots
                      ? "border-border bg-surface hover:border-primary-mid"
                      : "cursor-not-allowed border-border bg-muted text-text-muted",
                )}
                disabled={!hasSlots}
              >
                <div
                  className={cn(
                    "text-[11px] uppercase",
                    active ? "text-white/80" : "text-text-muted",
                  )}
                >
                  {formatDayLabel(day)}
                </div>
                <div className="mt-1 font-serif text-xl">
                  {formatDayNumber(day)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {slotsForSelectedDay.map((entry) => {
            const timeLabel = formatSlotTime(entry.starts_at);
            const active = slot?.starts_at === entry.starts_at;
            return (
              <button
                key={entry.starts_at}
                onClick={() => setSlot(entry)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-sm transition-colors cursor-pointer ",
                  !active && "border-border hover:border-primary-mid",
                  active && "border-primary bg-primary text-white",
                )}
              >
                {timeLabel}
              </button>
            );
          })}
        </div>

        {availableDays.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-text-secondary">
            No availability returned for the next 7 days.
          </div>
        ) : slotsForSelectedDay.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-text-secondary">
            No slots available on this date.
          </div>
        ) : null}

        <Button
          disabled={!slot}
          onClick={() => setConfirm(true)}
          className="mt-6 w-full bg-primary hover:bg-primary-mid cursor-pointer"
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
                {selectedDay
                  ? new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      timeZone: "Asia/Manila",
                    }).format(selectedDay)
                  : ""}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Time: </span>
              <span className="font-medium">
                {slot
                  ? `${formatSlotTime(slot.starts_at)} - ${formatSlotTime(slot.ends_at)}`
                  : ""}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Fee: </span>
              <span className="font-medium">
                ₱{doctor.fee.toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button className="cursor-pointer" variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-mid cursor-pointer"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Creating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
