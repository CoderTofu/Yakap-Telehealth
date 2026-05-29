"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type MedicalRecord = {
  id: string;
  appointment_id: string;
  subjective: string | null;
  diagnosis: string | null;
  prescription: string | null;
  created_at: string;
  scheduled_at: string;
  doctor_name: string;
  specialization: string | null;
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function Records() {
  const [records, setRecords] = useState<MedicalRecord[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRecords() {
      try {
        const json = await apiRequest<{ data: MedicalRecord[] }>(
          "/api/v1/patients/me/records",
        );

        if (mounted) {
          const nextRecords = Array.isArray(json.data) ? json.data : [];
          setRecords(nextRecords);
          setOpenId(nextRecords[0]?.id ?? null);
        }
      } catch (error) {
        console.error("failed to fetch medical records", error);
        if (mounted) {
          setRecords([]);
          setOpenId(null);
        }
      }
    }

    void fetchRecords();

    return () => {
      mounted = false;
    };
  }, []);

  if (records === null) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading medical records...
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={FileText}
          title="No medical records yet"
          description="Book your first consultation to start building your health history."
          action={
            <Button asChild className="bg-primary hover:bg-primary-mid">
              <Link href="/patient/doctors">Find a Doctor</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
      <ul className="space-y-4">
        {records.map((r) => {
          const open = openId === r.id;
          return (
            <li key={r.id} className="relative pl-10">
              <span className="absolute left-1.5 top-5 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
              <div className="rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left cursor-pointer"
                >
                  <div>
                    <div className="text-xs uppercase tracking-wide text-text-muted">
                      {formatDate(r.scheduled_at)}
                    </div>
                    <div className="mt-1 font-medium text-text-primary">
                      {r.doctor_name} {r.specialization ? `· ${r.specialization}` : ""}
                    </div>
                    <div className="mt-0.5 text-sm text-text-secondary">
                      {r.diagnosis ?? "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status="completed" />
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </div>
                </button>
                {open && (
                  <div className="space-y-4 border-t border-border bg-bg/40 p-5 text-sm">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-text-muted">
                        Subjective findings
                      </div>
                      <p className="mt-1 text-text-primary">
                        {r.subjective ?? "-"}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-text-muted">
                        Prescription
                      </div>
                      <p className="mt-1 text-text-primary">{r.prescription ?? "-"}</p>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
