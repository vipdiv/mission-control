"use client";

import { useEffect, useMemo, useState } from "react";

type Lane = "backlog" | "in_progress" | "review";
type Source = "vinderprime" | "manual";

type Task = {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;
  createdAt: string;
  updatedAt: string;
  source?: Source;

  vpDate?: string;         // ✅ YYYY-MM-DD (America/Chicago)
  createdAtLocal?: string; // optional
};

async function apiGet(): Promise<Task[]> {
  const res = await fetch("/api/tasks", { cache: "no-store" });
  const data = await res.json();
  return data.tasks as Task[];
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function chicagoVpDateToday(): string {
  // Build YYYY-MM-DD in America/Chicago using Intl
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setTasks(await apiGet());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const backlog = useMemo(() => tasks.filter((t) => t.lane === "backlog"), [tasks]);
  const inProgress = useMemo(() => tasks.filter((t) => t.lane === "in_progress"), [tasks]);
  const review = useMemo(() => tasks.filter((t) => t.lane === "review"), [tasks]);

  // ✅ Today (Chicago): use vpDate key sent by bot
  const todayChicago = useMemo(() => chicagoVpDateToday(), []);
  const todayCount = useMemo(() => tasks.filter((t) => t.vpDate === todayChicago).length, [tasks, todayChicago]);

  // “This week (Chicago)” = tasks with vpDate >= Monday Chicago
  const thisWeekCount = useMemo(() => {
    // find Monday in Chicago, then compare by YYYY-MM-DD strings
    const now = new Date();
    const tz = "America/Chicago";

    // get Chicago "today" as YYYY-MM-DD, then compute day-of-week by constructing a date
    const todayStr = chicagoVpDateToday();
    const [yy, mm, dd] = todayStr.split("-").map(Number);

    // Create a Date at noon UTC-ish to avoid DST edge issues; only used to compute day index
    const approx = new Date(Date.UTC(yy, mm - 1, dd, 18, 0, 0)); // 12pm CT-ish
    const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(approx);

    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = map[day] ?? 0;

    // diff from Monday
    const diffToMon = (dow + 6) % 7;

    const monday = new Date(approx);
    monday.setUTCDate(monday.getUTCDate() - diffToMon);

    const mondayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(monday);

    const y = mondayParts.find((p) => p.type === "year")?.value ?? "0000";
    const m = mondayParts.find((p) => p.type === "month")?.value ?? "01";
    const d = mondayParts.find((p) => p.type === "day")?.value ?? "01";
    const mondayStr = `${y}-${m}-${d}`;

    return tasks.filter((t) => (t.vpDate ?? "") >= mondayStr).length;
  }, [tasks]);

  // Completion: treat "review" as “done-ish” for now
  const completion = useMemo(() => {
    if (tasks.length === 0) return 0;
    return review.length / tasks.length;
  }, [tasks.length, review.length]);

  const activity = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return sorted.slice(0, 12);
  }, [tasks]);

  async function addTask() {
    const t = title.trim();
    if (!t) return;

    // Manual task: still tags vpDate Chicago so “today” works
    const vpDate = chicagoVpDateToday();

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, notes: notes.trim() || undefined, source: "manual", vpDate }),
    });

    setTitle("");
    setNotes("");
    await refresh();
  }

  async function move(id: string, lane: Lane) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, lane }),
    });
    await refresh();
  }

  async function remove(id: string) {
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              MC
            </div>
            <div>
              <div className="text-lg font-bold">Mission Control</div>
              <div className="text-xs text-white/60">Backlog → In Progress → Review</div>
            </div>
          </div>
          <div className="text-xs text-white/60">
            👑 VinderPrime-ready • Local only • Today(CT): {todayChicago}
          </div>
        </div>
      </div>

      {/* Metrics + Input */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="Today (Chicago)" value={String(todayCount)} />
          <Metric label="This week (Chicago)" value={String(thisWeekCount)} />
          <Metric label="In progress" value={String(inProgress.length)} />
          <Metric label="Total" value={String(tasks.length)} />
          <Metric label="Completion" value={pct(completion)} />
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-3">
          <input
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-white/30"
            placeholder="New task title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <input
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-white/30"
            placeholder="Notes (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <button
            className="rounded-xl px-4 py-2 border border-white/15 font-semibold bg-white/10 hover:bg-white/15"
            onClick={addTask}
          >
            + New task
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Board */}
          <div className="grid gap-4 md:grid-cols-3">
            <LaneColumn
              title="Backlog"
              count={backlog.length}
              loading={loading}
              tasks={backlog}
              badge="Ready"
              onMove={(id) => move(id, "in_progress")}
              moveLabel="Start"
              onDelete={remove}
            />
            <LaneColumn
              title="In Progress"
              count={inProgress.length}
              loading={loading}
              tasks={inProgress}
              badge="Active"
              onMove={(id) => move(id, "review")}
              moveLabel="To review"
              onDelete={remove}
            />
            <LaneColumn
              title="Review"
              count={review.length}
              loading={loading}
              tasks={review}
              badge="Ready to ship"
              onMove={(id) => move(id, "backlog")}
              moveLabel="Backlog"
              onDelete={remove}
            />
          </div>

          {/* Activity */}
          <div className="border border-white/10 rounded-2xl p-4 bg-white/5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-bold">Activity</div>
                <div className="text-xs text-white/60">Most recently updated</div>
              </div>
              <button className="text-xs text-white/70 hover:text-white" onClick={refresh} title="Refresh">
                ↻
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-white/60">Loading…</div>
              ) : activity.length === 0 ? (
                <div className="text-sm text-white/60">No activity yet.</div>
              ) : (
                activity.map((t) => (
                  <div key={t.id} className="rounded-xl border border-white/10 p-3">
                    <div className="text-sm font-semibold line-clamp-2">{t.title}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                      <span>
                        {t.source === "vinderprime" ? "👑 VinderPrime" : "✍️ Manual"} • {laneLabel(t.lane)}
                      </span>
                      <span>
                        {t.vpDate ? `${t.vpDate} (CT)` : new Date(t.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-xs text-white/50">
              Tip: “Review” is your staging lane before any push-live approval.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function laneLabel(l: Lane) {
  if (l === "backlog") return "Backlog";
  if (l === "in_progress") return "In Progress";
  return "Review";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-white/5">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function LaneColumn(props: {
  title: string;
  count: number;
  badge: string;
  tasks: Task[];
  loading: boolean;
  moveLabel: string;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-white/5 min-h-[420px]">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-bold">{props.title}</div>
          <div className="text-xs text-white/60">{props.badge}</div>
        </div>
        <span className="text-xs text-white/70">{props.count}</span>
      </div>

      <div className="mt-4 space-y-3">
        {props.loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : props.tasks.length === 0 ? (
          <div className="text-sm text-white/60">No tasks.</div>
        ) : (
          props.tasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 p-3 bg-black/30">
              <div className="font-semibold">{t.title}</div>
              {t.notes ? <div className="text-sm text-white/75 mt-1">{t.notes}</div> : null}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-white/60">
                  {t.source === "vinderprime" ? "👑 VinderPrime" : "✍️ Manual"}
                  {t.vpDate ? ` • ${t.vpDate} (CT)` : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    className="text-xs px-3 py-1 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15"
                    onClick={() => props.onMove(t.id)}
                  >
                    {props.moveLabel}
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-xl border border-white/15 hover:bg-white/10"
                    onClick={() => props.onDelete(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}