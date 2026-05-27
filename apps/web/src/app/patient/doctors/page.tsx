"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { DOCTORS, SPECIALTIES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function FindDoctors() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [highlight, setHighlight] = useState<string[]>([]);

  const results = useMemo(() => {
    return DOCTORS.filter((d) => {
      if (query && !d.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (selected.length && !selected.includes(d.specialty)) return false;
      return true;
    });
  }, [query, selected]);

  function toggle(name: string) {
    setSelected((s) =>
      s.includes(name) ? s.filter((x) => x !== name) : [...s, name],
    );
  }

  function aiRecommend() {
    if (!symptoms.trim()) return;
    const picks = ["Cardiology", "General Medicine"];
    setHighlight(picks);
    setSelected(picks);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Left filters */}
      <aside className="space-y-4">
        {/* AI symptom search */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-mid" />
            <h3 className="text-sm font-semibold text-text-primary">
              Describe what you're feeling
            </h3>
          </div>
          <Textarea
            className="mt-3"
            rows={3}
            placeholder="e.g. recurring migraines for two weeks..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <Button
            className="mt-3 w-full bg-primary hover:bg-primary-mid"
            onClick={aiRecommend}
          >
            Get AI Recommendation
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-9"
              placeholder="Search doctors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Specialization
          </h4>
          <ul className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {SPECIALTIES.map((s) => {
              const checked = selected.includes(s.name);
              const isHighlight = highlight.includes(s.name);
              return (
                <li key={s.name}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      isHighlight && "bg-accent-light",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(s.name)}
                      className="h-4 w-4 rounded border-border accent-[#0B4F71]"
                    />
                    <span className="text-text-primary">{s.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Availability
          </h4>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option>Any day</option>
            <option>Today</option>
            <option>This week</option>
          </select>

          <div className="mt-5 flex gap-2">
            <Button className="flex-1 bg-primary hover:bg-primary-mid">
              Apply
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSelected([]);
                setQuery("");
                setHighlight([]);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </aside>

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Showing{" "}
            <span className="font-medium text-text-primary">
              {results.length}
            </span>{" "}
            doctors
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((d) => (
            <article
              key={d.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:border-primary-mid hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <YakapAvatar name={d.name} color={d.avatarColor} size={52} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-text-primary">{d.name}</h3>
                  <span className="mt-1 inline-flex rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                    {d.specialty}
                  </span>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-text-secondary">
                {d.bio}
              </p>
              <div className="mt-3 text-xs text-text-muted">
                {d.experience} years experience
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.availableDays.map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-primary-mid"
                >
                  <Link href="/patient/doctors/$id" params={{ id: d.id }}>
                    View Profile
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
