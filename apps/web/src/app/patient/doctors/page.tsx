"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { YakapAvatar } from "@/components/shared/avatar";
import { SPECIALTIES, DAYS } from "@/lib/appConfig";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

type Specialization = {
  specialization?: string[];
};

export default function FindDoctors() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [highlight, setHighlight] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [availability, setAvailability] = useState<number>()
  const [isRecommending, setIsRecommending] = useState(false);

  async function loadDoctors(search: string, specializations: string[], day: number = -1) {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      specializations.forEach((specialization) => {
        params.append("specialization", specialization);
      });
      if (day != -1) params.append("day_of_week", day.toString())

      params.set("page", "1");
      params.set("limit", "12");

      const json = await apiRequest<{ data: { items: any[] } }>(
        `/api/v1/doctors?${params.toString()}`,
      );

      setDoctors(json.data?.items ?? []);
    } catch (err) {
      console.error("failed to fetch doctors", err);
    }
  }

  async function getSpecialization(text: string): Promise<Specialization> {
    return apiRequest<Specialization>("/api/v1/gemini", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  useEffect(() => {
    void loadDoctors("", []);
  }, []);

  function toggle(name: string) {
    setSelected((s) =>
      s.includes(name) ? s.filter((x) => x !== name) : [...s, name],
    );
  }

  async function aiRecommend() {
    if (!symptoms.trim()) return;
    if (isRecommending) return;

    try {
      setIsRecommending(true);
      const overview = await getSpecialization(symptoms.trim());
      const picks = overview.specialization ?? [];

      setSelected(picks);
      await loadDoctors(query, picks, availability ?? -1);
    } catch (error) {
      console.error("failed to get AI recommendation", error);
    } finally {
      setIsRecommending(false);
    }
  }

  function numToWeek(num: number) {
    const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return week[num];
  }

  function formatSpecialization(value?: string) {
    if (!value) return "Unknown";

    return (
      SPECIALTIES.find((specialty) => specialty.value === value)?.label ??
      value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
        .join(" ")
    );
  }
  
  async function filter() {
    await loadDoctors(query, selected, availability);
    console.log("hello")
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setAvailability(Number(e.target.value));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Left filters */}
      <aside className="space-y-4">
        {/* TODO: AI symptom search */}
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
            disabled={isRecommending || !symptoms.trim()}
            onClick={aiRecommend}
          >
            {isRecommending ? "Analyzing..." : "Get AI Recommendation"}
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
          <ul className="max-h-70 space-y-1 overflow-y-auto pr-1">
            {SPECIALTIES.map((s) => {
              const checked = selected.includes(s.value);
              const isHighlight = highlight.includes(s.value);
              return (
                <li key={s.value}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      isHighlight && "bg-accent-light",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(s.value)}
                      className="h-4 w-4 rounded border-border accent-[#0B4F71]"
                    />
                    <span className="text-text-primary">{s.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Availability
          </h4>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer" onChange={handleChange} value={availability}>
            {DAYS.map((d) => 
              <option key={d.value} value={d.value}>{d.label}</option>
            )}
          </select>

          <div className="mt-5 flex gap-2">
            {/* TODO: Fix Logic */}
            <Button
              className="flex-1 bg-primary hover:bg-primary-mid"
              onClick={() => void filter()}
            >
              Apply
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setSelected([]);
                setQuery("");
                setHighlight([]);
                setAvailability(DAYS[0].value);
                void loadDoctors("", []);
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
              {doctors.length}
            </span>{" "}
            doctors
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map((d) => (
            <article
              key={d.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:border-primary-mid hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <YakapAvatar name={d.name} color={d.avatarColor} size={52} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-text-primary">{d.name}</h3>
                  <span className="mt-1 inline-flex rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                    {formatSpecialization(d.specialization)}
                  </span>
                </div>
              </div>
              <p className="mt-3 h-10 overflow-hidden text-sm leading-5 text-text-secondary line-clamp-2">
                {d.bio === null || d.bio === "" ? "Doctor has yet to configure their bio." : d.bio}
              </p>
              <div className="mt-3 text-xs text-text-muted">
                {d.years_exp} years experience
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.schedule_days?.map((day: number) => (
                  <span
                    key={day}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                  >
                    {numToWeek(day)}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-4">
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-primary-mid"
                >
                  <Link href={`/patient/doctors/${d.id}`}>View Profile</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
