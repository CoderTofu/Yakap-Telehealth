"use client";

import { YakapAvatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATIENTS, calcAge } from "@/lib/mock-data";
import { Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function PatientsList() {
  const [q, setQ] = useState("");
  const list = PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

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
                    <YakapAvatar
                      name={p.name}
                      color={p.avatarColor}
                      size={36}
                    />
                    <span className="font-medium text-text-primary">
                      {p.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-text-secondary">
                  {calcAge(p.dob)}
                </td>
                <td className="px-5 py-4 text-text-secondary">{p.phone}</td>
                <td className="px-5 py-4 text-right">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/doctor/patients/$id" params={{ id: p.id }}>
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
