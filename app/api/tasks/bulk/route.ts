import { NextResponse } from "next/server";

type Lane = "backlog" | "in_progress" | "review";
type Source = "vinderprime" | "manual";

type Task = {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;
  createdAt: string;        // UTC ISO
  updatedAt: string;        // UTC ISO
  source?: Source;
  vpDate?: string;          // YYYY-MM-DD America/Chicago
  createdAtLocal?: string;  // optional display
};

declare global {
  // simple in-memory store for local demo
  var __TASKS__: Task[] | undefined;
}

function store(): Task[] {
  if (!global.__TASKS__) global.__TASKS__ = [];
  return global.__TASKS__;
}

function id(prefix = "t") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

// If vpDate is missing, set it using server-local timezone *only as fallback*.
// Best practice: bot always sends vpDate.
function fallbackVpDateFromUtc(isoUtc: string) {
  // crude fallback: just take UTC date portion. (Bot should supply vpDate.)
  return isoUtc.slice(0, 10);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const incoming = Array.isArray(body.tasks) ? body.tasks : [];
  const tasks = store();

  const added: Task[] = [];

  for (const t of incoming) {
    const title = String(t.title || "").trim();
    if (!title) continue;

    const nowIso = new Date().toISOString();

    const createdAt = typeof t.createdAt === "string" ? t.createdAt : nowIso;
    const vpDate = typeof t.vpDate === "string" ? t.vpDate : fallbackVpDateFromUtc(createdAt);

    const task: Task = {
      id: id("t"),
      title,
      notes: typeof t.notes === "string" ? t.notes : undefined,
      lane: (t.lane === "in_progress" || t.lane === "review" || t.lane === "backlog") ? t.lane : "backlog",
      source: (t.source === "manual" || t.source === "vinderprime") ? t.source : "manual",
      createdAt,
      updatedAt: nowIso,
      vpDate,
      createdAtLocal: typeof t.createdAtLocal === "string" ? t.createdAtLocal : undefined,
    };

    tasks.unshift(task);
    added.push(task);
  }

  return NextResponse.json({ added: added.length });
}