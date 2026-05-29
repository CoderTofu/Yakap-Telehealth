"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Plus, Save, Clock3, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

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
  const [isEditing, setIsEditing] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
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
      setIsEditing(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save schedule");
    } finally {
      setSavingWeekly(false);
    }
  }

  function requestSaveWeeklySchedule() {
    setSaveConfirmOpen(true);
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

  function requestAddBlock() {
    if (!blockDate || !blockStartTime || !blockEndTime) {
      alert("Choose a date, start time, and end time for the block.");
      return;
    }

    void addBlock();
  }

  const activeDays = weekly.filter((row) => row.enabled).length;
  const totalDailyHours = weekly.reduce((total, row) => {
    if (!row.enabled) return total;
    return total + timeRangeHours(row.start_time, row.end_time);
  }, 0);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="bg-linear-to-br from-primary-light via-surface to-surface px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Schedule overview
              </div>
              <h2 className="mt-4 font-serif text-3xl text-text-primary md:text-4xl">
                Doctor schedule
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                Set your weekly availability, block off exceptions, and keep your booking flow clear for patients.
              </p>
            </div>
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)} disabled={loading}>
                Edit schedule
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={savingWeekly || savingBlock}>
                  Cancel
                </Button>
                <Button onClick={requestSaveWeeklySchedule} disabled={savingWeekly || savingBlock || loading} className="bg-primary hover:bg-primary-mid">
                  {savingWeekly ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Active days" value={String(activeDays)} helper="Recurring availability" />
            <SummaryCard label="Weekly hours" value={`${totalDailyHours.toFixed(1)}h`} helper="Total open hours" />
            <SummaryCard label="Blocked slots" value={String(blocks.length)} helper="One-off exceptions" />
          </div>

          {!isEditing ? (
            <div className="mt-4 rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-text-secondary">
              Viewing mode is active. Switch to edit mode to change availability or add blocked times.
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-light px-4 py-3 text-sm text-primary">
              Editing mode is on. Use Save Changes to apply updates or Cancel to discard edits.
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule...
          </div>
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl text-text-primary">Weekly availability</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  This is what patients will see when they book.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-text-secondary">
                <Clock3 className="h-3.5 w-3.5" />
                Manila time
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {weekly.map((row) => (
              <div
                key={row.day_of_week}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  row.enabled
                    ? "border-primary/25 bg-linear-to-br from-primary-light/40 to-white shadow-sm"
                    : "border-border bg-muted/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{DAYS[row.day_of_week]}</div>
                    <div className="mt-1 text-xs text-text-muted">
                      {row.enabled ? "Visible to patients" : "Disabled"}
                    </div>
                  </div>
                  {isEditing ? (
                    <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary cursor-pointer">
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
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        row.enabled
                          ? "bg-primary-light text-primary"
                          : "bg-muted/40 text-text-muted",
                      )}
                    >
                      {row.enabled ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={row.start_time}
                      disabled={!isEditing || !row.enabled}
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
                      disabled={!isEditing || !row.enabled}
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
                {!isEditing ? (
                  <div className="mt-4 rounded-xl border border-border bg-surface/80 px-3 py-2 text-sm text-text-secondary">
                    {row.enabled
                      ? `${row.start_time} to ${row.end_time}`
                      : "No availability set"}
                  </div>
                ) : null}
              </div>
            ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-text-primary">Blocked times</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Use this for one-off breaks, holidays, or emergency closures.
                </p>
              </div>
              <span className="rounded-full bg-muted/40 px-3 py-1 text-xs font-medium text-text-secondary">
                {blocks.length} entries
              </span>
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
                  <div
                    key={block.id}
                    className="rounded-2xl border border-border bg-muted/10 p-4"
                  >
                    <div className="text-sm font-semibold text-text-primary">
                      {formatBlockDateTime(block.starts_at)} - {formatBlockDateTime(block.ends_at)}
                    </div>
                    {block.reason ? (
                      <div className="mt-1 text-sm text-text-secondary">{block.reason}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary-light/50 px-4 py-3 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              Edit mode controls the form below. Switch it on to add or update blocks.
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-xl text-text-primary">Add a block</h3>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-muted/10 p-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={blockDate}
                onChange={(event) => setBlockDate(event.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={blockStartTime}
                  onChange={(event) => setBlockStartTime(event.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="time"
                  value={blockEndTime}
                  onChange={(event) => setBlockEndTime(event.target.value)}
                  disabled={!isEditing}
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
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-border bg-linear-to-br from-primary-light/70 to-white p-5">
            <div>
              <div className="text-sm font-semibold text-text-primary">Block preview</div>
              <p className="mt-1 text-sm text-text-secondary">
                The selected range will be hidden from new patient bookings.
              </p>
              <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                <div className="text-xs uppercase tracking-wide text-text-muted">Selected time</div>
                <div className="mt-2 text-sm font-medium text-text-primary">
                  {blockDate || "No date selected"}
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  {blockStartTime && blockEndTime
                    ? `${blockStartTime} - ${blockEndTime}`
                    : "Pick a start and end time"}
                </div>
                {blockReason.trim() ? (
                  <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2 text-sm text-text-secondary">
                    {blockReason}
                  </div>
                ) : null}
              </div>
            </div>

            {isEditing ? (
              <Button onClick={requestAddBlock} disabled={savingBlock} className="mt-4 w-full bg-primary hover:bg-primary-mid">
                {savingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add block
              </Button>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
                Switch to edit mode to add blocked times.
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Save schedule changes?"
        description="This will update the availability patients see when booking appointments."
        confirmLabel="Save Changes"
        confirmingLabel="Saving..."
        isConfirming={savingWeekly}
        onConfirm={async () => {
          setSaveConfirmOpen(false);
          await saveWeeklySchedule();
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-serif text-text-primary">{value}</div>
      <div className="mt-1 text-sm text-text-secondary">{helper}</div>
    </div>
  );
}

function timeRangeHours(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) {
    return 0;
  }

  const startTotal = startHour + startMinute / 60;
  const endTotal = endHour + endMinute / 60;
  return Math.max(0, endTotal - startTotal);
}
