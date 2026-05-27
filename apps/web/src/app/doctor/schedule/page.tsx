"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Plus, Save } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type WeeklyScheduleRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
};

type ScheduleBlock = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildDefaultWeeklySchedule() {
  return DAYS.map((label, day_of_week) => ({
    label,
    day_of_week,
    enabled: false,
    start_time: "09:00",
    end_time: "17:00",
  }));
}

function formatBlockDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

export default function DoctorSchedulePage() {
  const [weekly, setWeekly] = useState(buildDefaultWeeklySchedule());
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchSchedule() {
      try {
        const json = await apiRequest<{
          data: {
            weekly: Array<{
              day_of_week: number;
              start_time: string;
              end_time: string;
            }>;
            blocks: ScheduleBlock[];
          };
        }>("/api/v1/doctors/me/schedule");

        if (!mounted) return;

        const nextWeekly = buildDefaultWeeklySchedule();
        for (const row of json.data.weekly ?? []) {
          const current = nextWeekly[row.day_of_week];
          if (!current) continue;
          current.enabled = true;
          current.start_time = row.start_time.slice(0, 5);
          current.end_time = row.end_time.slice(0, 5);
        }

        setWeekly(nextWeekly);
        setBlocks(json.data.blocks ?? []);
      } catch (error) {
        console.error("failed to fetch doctor schedule", error);
        if (mounted) {
          setWeekly(buildDefaultWeeklySchedule());
          setBlocks([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSchedule();

    return () => {
      mounted = false;
    };
  }, []);

  async function saveWeeklySchedule() {
    setSavingWeekly(true);
    try {
      const schedules = weekly
        .filter((row) => row.enabled)
        .map((row) => ({
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
        }));

      const json = await apiRequest<{
        data: {
          weekly: Array<{
            day_of_week: number;
            start_time: string;
            end_time: string;
          }>;
          blocks: ScheduleBlock[];
        };
      }>(
        "/api/v1/doctors/me/schedule",
        {
          method: "PUT",
          body: JSON.stringify({ schedules }),
        },
      );

      const nextWeekly = buildDefaultWeeklySchedule();
      for (const row of json.data.weekly ?? []) {
        const current = nextWeekly[row.day_of_week];
        if (!current) continue;
        current.enabled = true;
        current.start_time = row.start_time.slice(0, 5);
        current.end_time = row.end_time.slice(0, 5);
      }
      setWeekly(nextWeekly);
      setBlocks(json.data.blocks ?? []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save schedule");
    } finally {
      setSavingWeekly(false);
    }
  }

  async function addBlock() {
    if (!blockDate || !blockStartTime || !blockEndTime) {
      alert("Choose a date, start time, and end time for the block.");
      return;
    }

    setSavingBlock(true);
    try {
      await apiRequest<{ data: ScheduleBlock }>("/api/v1/doctors/me/blocks", {
        method: "POST",
        body: JSON.stringify({
          starts_at: `${blockDate}T${blockStartTime}:00+08:00`,
          ends_at: `${blockDate}T${blockEndTime}:00+08:00`,
          reason: blockReason || undefined,
        }),
      });

      const refreshed = await apiRequest<{
        data: {
          weekly: Array<{
            day_of_week: number;
            start_time: string;
            end_time: string;
          }>;
          blocks: ScheduleBlock[];
        };
      }>("/api/v1/doctors/me/schedule");

      const nextWeekly = buildDefaultWeeklySchedule();
      for (const row of refreshed.data.weekly ?? []) {
        const current = nextWeekly[row.day_of_week];
        if (!current) continue;
        current.enabled = true;
        current.start_time = row.start_time.slice(0, 5);
        current.end_time = row.end_time.slice(0, 5);
      }

      setWeekly(nextWeekly);
      setBlocks(refreshed.data.blocks ?? []);
      setBlockDate("");
      setBlockStartTime("");
      setBlockEndTime("");
      setBlockReason("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add block");
    } finally {
      setSavingBlock(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Doctor schedule</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Set the hours you are available for booking and add blocks for days off or breaks.
            </p>
          </div>
          <Button onClick={saveWeeklySchedule} disabled={savingWeekly || loading} className="bg-primary hover:bg-primary-mid">
            {savingWeekly ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save weekly schedule
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule...
          </div>
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="grid gap-3 lg:grid-cols-2">
            {weekly.map((row) => (
              <div
                key={row.day_of_week}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  row.enabled ? "border-primary/30 bg-primary-light/20" : "border-border bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{DAYS[row.day_of_week]}</div>
                    <div className="text-xs text-text-muted">Availability for {DAYS[row.day_of_week]}</div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) =>
                        setWeekly((current) =>
                          current.map((entry) =>
                            entry.day_of_week === row.day_of_week
                              ? { ...entry, enabled: event.target.checked }
                              : entry,
                          ),
                        )
                      }
                    />
                    Active
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={row.start_time}
                      disabled={!row.enabled}
                      onChange={(event) =>
                        setWeekly((current) =>
                          current.map((entry) =>
                            entry.day_of_week === row.day_of_week
                              ? { ...entry, start_time: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End</Label>
                    <Input
                      type="time"
                      value={row.end_time}
                      disabled={!row.enabled}
                      onChange={(event) =>
                        setWeekly((current) =>
                          current.map((entry) =>
                            entry.day_of_week === row.day_of_week
                              ? { ...entry, end_time: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl text-text-primary">Blocked times</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Use this for one-off breaks, holidays, or emergency closures.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {blocks.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No blocked times yet"
                description="Add a block to prevent patients from booking those hours."
              />
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="rounded-xl border border-border p-4">
                  <div className="text-sm font-medium text-text-primary">
                    {formatBlockDateTime(block.starts_at)} - {formatBlockDateTime(block.ends_at)}
                  </div>
                  {block.reason ? (
                    <div className="mt-1 text-sm text-text-secondary">{block.reason}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-xl text-text-primary">Add a block</h3>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={blockStartTime}
                  onChange={(event) => setBlockStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="time"
                  value={blockEndTime}
                  onChange={(event) => setBlockEndTime(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={4}
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder="Lunch break, family emergency, clinic closure..."
              />
            </div>
            <Button onClick={addBlock} disabled={savingBlock} className="w-full bg-primary hover:bg-primary-mid">
              {savingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add block
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
