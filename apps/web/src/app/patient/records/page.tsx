"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { APPOINTMENTS, formatDate, getDoctor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Records() {
  const records = APPOINTMENTS.filter(
    (a) => a.patientId === "p1" && a.status === "completed",
  );
  const [openId, setOpenId] = useState<string | null>(records[0]?.id ?? null);

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
          const doc = getDoctor(r.doctorId)!;
          const open = openId === r.id;
          return (
            <li key={r.id} className="relative pl-10">
              <span className="absolute left-1.5 top-5 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
              <div className="rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <div className="text-xs uppercase tracking-wide text-text-muted">
                      {formatDate(r.date)}
                    </div>
                    <div className="mt-1 font-medium text-text-primary">
                      {doc.name} · {doc.specialty}
                    </div>
                    <div className="mt-0.5 text-sm text-text-secondary">
                      {r.notes?.diagnosis ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </div>
                </button>
                {open && r.notes && (
                  <div className="space-y-4 border-t border-border bg-bg/40 p-5 text-sm">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-text-muted">
                        Subjective findings
                      </div>
                      <p className="mt-1 text-text-primary">
                        {r.notes.subjective}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-text-muted">
                        Prescription
                      </div>
                      <ul className="mt-1 space-y-1">
                        {r.notes.prescriptions.map((p, i) => (
                          <li key={i} className="text-text-primary">
                            <span className="font-medium">{p.name}</span>{" "}
                            {p.dosage} · {p.frequency} ({p.duration})
                          </li>
                        ))}
                      </ul>
                    </div>
                    {r.notes.recommendations && (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-text-muted">
                          Recommendations
                        </div>
                        <p className="mt-1 text-text-primary">
                          {r.notes.recommendations}
                        </p>
                      </div>
                    )}
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
