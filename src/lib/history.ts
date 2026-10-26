// Browser-only letter history, stored in IndexedDB. Nothing here runs at module
// top level: the IndexedDB library is imported lazily on first use, so this file
// is safe to import from SSR-rendered components (only call it in effects/handlers).

export interface LetterOptions {
  tone: string;
  length: string;
  focus: string;
}

export interface HistoryVersion {
  id: string;
  label: string;
  letter: string;
  notes: string;
  options: LetterOptions;
  feedback?: string;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  company: string;
  jobTitle: string;
  jobText: string;
  extra: string;
  resumeLabel: string;
  usedScreenshots: boolean;
  options: LetterOptions;
  versions: HistoryVersion[];
  activeVersionId: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_ENTRIES = 100;
export const MAX_JOB_TEXT = 20_000;

export interface HistoryStore {
  getAll(): Promise<HistoryEntry[]>;
  get(id: string): Promise<HistoryEntry | undefined>;
  set(entry: HistoryEntry): Promise<void>;
  del(id: string): Promise<void>;
  clear(): Promise<void>;
}

let store: HistoryStore | null = null;

/** Swap the storage layer (used by tests). */
export function setHistoryStore(s: HistoryStore | null) {
  store = s;
}

async function getStore(): Promise<HistoryStore> {
  if (store) return store;
  if (typeof indexedDB === "undefined") throw new Error("History isn't available in this browser.");
  const idb = await import("idb-keyval");
  const s = idb.createStore("letterly", "history");
  store = {
    getAll: () => idb.values<HistoryEntry>(s),
    get: (id) => idb.get<HistoryEntry>(id, s),
    set: (e) => idb.set(e.id, e, s),
    del: (id) => idb.del(id, s),
    clear: () => idb.clear(s),
  };
  return store;
}

const uid = () => crypto.randomUUID();

// ---------- pure helpers ----------

export function makeTitle(jobTitle: string, company: string) {
  const t = jobTitle.trim();
  const c = company.trim();
  if (t && c) return `${t} at ${c}`;
  return t || c || "Untitled letter";
}

export function resumeLabelOf(resume: string) {
  const line = resume.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.slice(0, 60);
}

export function sortEntries(entries: HistoryEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function filterEntries(entries: HistoryEntry[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      e.versions.some((v) => v.letter.toLowerCase().includes(q)),
  );
}

export type GroupLabel = "Today" | "Yesterday" | "Previous 7 days" | "Older";

export function groupEntries(entries: HistoryEntry[], now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const yesterday = today - 86_400_000;
  const week = today - 7 * 86_400_000;
  const order: GroupLabel[] = ["Today", "Yesterday", "Previous 7 days", "Older"];
  const groups = new Map<GroupLabel, HistoryEntry[]>(order.map((l) => [l, []]));
  for (const e of sortEntries(entries)) {
    const label: GroupLabel =
      e.updatedAt >= today ? "Today" : e.updatedAt >= yesterday ? "Yesterday" : e.updatedAt >= week ? "Previous 7 days" : "Older";
    groups.get(label)!.push(e);
  }
  return order.map((label) => ({ label, entries: groups.get(label)! })).filter((g) => g.entries.length);
}

/** Ids to drop so at most `max` remain; protected ids are never dropped. */
export function overflowIds(entries: HistoryEntry[], protect: string[], max = MAX_ENTRIES) {
  if (entries.length <= max) return [];
  const removable = [...entries].filter((e) => !protect.includes(e.id)).sort((a, b) => a.updatedAt - b.updatedAt);
  return removable.slice(0, entries.length - max).map((e) => e.id);
}

export function relativeTime(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function copyEntry(e: HistoryEntry, now = Date.now()): HistoryEntry {
  const idMap = new Map(e.versions.map((v) => [v.id, uid()]));
  return {
    ...e,
    id: uid(),
    title: `${e.title} (copy)`,
    versions: e.versions.map((v) => ({ ...v, id: idMap.get(v.id)! })),
    activeVersionId: idMap.get(e.activeVersionId) ?? idMap.values().next().value ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- storage API (throws when IndexedDB is unavailable) ----------

export async function listHistory() {
  return sortEntries(await (await getStore()).getAll());
}

export async function getEntry(id: string) {
  return (await getStore()).get(id);
}

export async function saveEntry(entry: HistoryEntry, protect: string[] = []) {
  const s = await getStore();
  await s.set({ ...entry, jobText: entry.jobText.slice(0, MAX_JOB_TEXT) });
  const drop = overflowIds(await s.getAll(), [entry.id, ...protect]);
  for (const id of drop) await s.del(id);
}

export async function deleteEntry(id: string) {
  await (await getStore()).del(id);
}

export async function clearHistory() {
  await (await getStore()).clear();
}

export async function renameEntry(id: string, title: string) {
  const s = await getStore();
  const e = await s.get(id);
  if (!e) return;
  await s.set({ ...e, title: title.trim() || makeTitle(e.jobTitle, e.company), updatedAt: Date.now() });
}

export async function duplicateEntry(id: string, protect: string[] = []) {
  const e = await getEntry(id);
  if (!e) return undefined;
  const copy = copyEntry(e);
  await saveEntry(copy, protect);
  return copy;
}
