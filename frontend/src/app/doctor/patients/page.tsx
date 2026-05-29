"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Users } from "lucide-react";

import { YakapAvatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api-client";

type PatientItem = {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;
};

function calcAge(dob: string | null) {
  if (!dob) return "-";

  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "-";

  const diff = Date.now() - d.getTime();
  return String(Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
}

function colorFromName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 35%)`;
}

export default function PatientsList() {
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<PatientItem[] | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPatients() {
      try {
        const json = await apiRequest<{ data: PatientItem[] }>(
          "/api/v1/doctors/me/patients",
        );

        if (mounted) {
          setPatients(Array.isArray(json.data) ? json.data : []);
        }
      } catch (error) {
        console.error("failed to fetch doctor patients", error);
        if (mounted) {
          setPatients([]);
        }
      }
    }

    void fetchPatients();

    return () => {
      mounted = false;
    };
  }, []);

  const list = useMemo(
    () =>
      (patients ?? []).filter((patient) =>
        patient.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [patients, q],
  );

  if (patients === null) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patients...
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Patients with confirmed or completed appointments will appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          className="pl-9"
          placeholder="Search patients..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-5 py-3">Patient</th>
              <th className="px-5 py-3">Age</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <YakapAvatar name={p.name} color={colorFromName(p.name)} size={36} />
                    <span className="font-medium text-text-primary">
                      {p.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-text-secondary">
                  {calcAge(p.date_of_birth)}
                </td>
                <td className="px-5 py-4 text-text-secondary">{p.phone ?? "-"}</td>
                <td className="px-5 py-4 text-right">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/doctor/patients/${p.id}`}>
                      View profile
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
