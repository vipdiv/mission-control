import { NextResponse } from "next/server";
import { fallbackVpDateFromIso, getStore, makeId, Task, Lane, Source } from "@/lib/tasksStore";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const incoming = Array.isArray(body.tasks) ? body.tasks : [];

  const tasks = getStore();
  let added = 0;

  for (const raw of incoming) {
    const title = String(raw?.title || "").trim();
    if (!title) continue;

    const nowIso = new Date().toISOString();
    const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : nowIso;

    const lane: Lane =
      raw.lane === "in_progress" || raw.lane === "review" || raw.lane === "backlog"
        ? raw.lane
        : "backlog";

    const source: Source =
      raw.source === "vinderprime" || raw.source === "manual" ? raw.source : "manual";

    const vpDate =
      typeof raw.vpDate === "string" && raw.vpDate.length === 10
        ? raw.vpDate
        : fallbackVpDateFromIso(createdAt);

    const task: Task = {
      id: makeId("t"),
      title,
      notes: typeof raw.notes === "string" ? raw.notes : undefined,
      lane,
      source,
      createdAt,
      updatedAt: nowIso,
      vpDate,
      createdAtLocal: typeof raw.createdAtLocal === "string" ? raw.createdAtLocal : undefined,
    };

    tasks.unshift(task);
    added++;
  }

  return NextResponse.json({ added }, { status: 201 });
}