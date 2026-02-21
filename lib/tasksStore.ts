export type Lane = "backlog" | "in_progress" | "review";
export type Source = "vinderprime" | "manual";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;

  // storage timestamps (UTC)
  createdAt: string;
  updatedAt: string;

  source?: Source;

  // ✅ THIS is the “today” key (America/Chicago date)
  vpDate?: string; // YYYY-MM-DD

  // optional display
  createdAtLocal?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __TASKS__: Task[] | undefined;
}

export function getStore(): Task[] {
  if (!global.__TASKS__) global.__TASKS__ = [];
  return global.__TASKS__;
}

export function makeId(prefix = "t"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

/**
 * Fallback ONLY. Bot should always provide vpDate.
 * If missing, we default to UTC day (not ideal).
 */
export function fallbackVpDateFromIso(iso: string): string {
  if (typeof iso === "string" && iso.length >= 10) return iso.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}