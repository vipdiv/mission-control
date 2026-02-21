import fs from "fs";
import path from "path";

export type Lane = "backlog" | "in_progress" | "review";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;
  createdAt: string;
  updatedAt: string;
  source?: "vinderprime" | "manual";
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "tasks.json");

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ tasks: [] }, null, 2));
  }
}

export function readTasks(): Task[] {
  ensureStore();
  const raw = fs.readFileSync(dataFile, "utf-8");
  const parsed = JSON.parse(raw) as { tasks: Task[] };
  return parsed.tasks ?? [];
}

export function writeTasks(tasks: Task[]) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify({ tasks }, null, 2));
}
