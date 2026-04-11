import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SavedTaskPayload, SavedTaskRecord } from "@/types/saved-task";

const dataDir = path.join(process.cwd(), "data", "tasks");
const storePath = path.join(dataDir, "saved-tasks.json");

type SavedTaskStore = {
  tasks: SavedTaskRecord[];
};

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as SavedTaskStore;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    } satisfies SavedTaskStore;
  } catch {
    const initial: SavedTaskStore = { tasks: [] };
    await writeFile(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listSavedTasks() {
  const store = await ensureStore();
  return [...store.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSavedTask(taskId: string) {
  const store = await ensureStore();
  return store.tasks.find((task) => task.id === taskId) ?? null;
}

export async function saveTask(payload: SavedTaskPayload) {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const id = `${slugify(payload.name) || "task"}-${Date.now()}`;

  const record: SavedTaskRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    ...payload,
  };

  store.tasks.unshift(record);
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  return record;
}

export async function updateTaskName(taskId: string, name: string) {
  const store = await ensureStore();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("타스크 이름이 비어 있습니다.");
  }

  const target = store.tasks.find((task) => task.id === taskId);

  if (!target) {
    return null;
  }

  target.name = trimmedName;
  target.updatedAt = new Date().toISOString();
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  return target;
}
