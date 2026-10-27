import { beforeEach, describe, expect, it } from "vitest";
import {
  clearHistory,
  deleteEntry,
  duplicateEntry,
  filterEntries,
  getEntry,
  groupEntries,
  listHistory,
  renameEntry,
  saveEntry,
  setHistoryStore,
} from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";
import { entry } from "./history-fixtures";

function memoryStore() {
  const m = new Map<string, HistoryEntry>();
  return {
    getAll: async () => [...m.values()],
    get: async (id: string) => m.get(id),
    set: async (e: HistoryEntry) => void m.set(e.id, e),
    del: async (id: string) => void m.delete(id),
    clear: async () => m.clear(),
  };
}

beforeEach(() => setHistoryStore(memoryStore()));

describe("groupEntries", () => {
  it("buckets by Today, Yesterday, Previous 7 days, Older", () => {
    const now = new Date(2026, 9, 26, 15, 0).getTime();
    const day = 86_400_000;
    const groups = groupEntries(
      [entry("a", now - 1000), entry("b", now - day), entry("c", now - 3 * day), entry("d", now - 30 * day)],
      now,
    );
    expect(groups.map((g) => [g.label, g.entries.map((e) => e.id)])).toEqual([
      ["Today", ["a"]],
      ["Yesterday", ["b"]],
      ["Previous 7 days", ["c"]],
      ["Older", ["d"]],
    ]);
  });
});

describe("filterEntries", () => {
  it("matches title, company and letter text case-insensitively", () => {
    const list = [
      entry("1", 1, { title: "Designer at Acme" }),
      entry("2", 2, { company: "Globex" }),
      entry("3", 3, { versions: [{ ...entry("3", 3).versions[0]!, letter: "I love KUBERNETES" }] }),
    ];
    expect(filterEntries(list, "acme").map((e) => e.id)).toEqual(["1"]);
    expect(filterEntries(list, "GLOBEX").map((e) => e.id)).toEqual(["2"]);
    expect(filterEntries(list, "kubernetes").map((e) => e.id)).toEqual(["3"]);
  });
});

describe("storage", () => {
  it("caps history at 100 entries, dropping the oldest", async () => {
    for (let i = 0; i < 101; i++) await saveEntry(entry(String(i), 1000 + i));
    const all = await listHistory();
    expect(all).toHaveLength(100);
    expect(all.find((e) => e.id === "0")).toBeUndefined();
  });

  it("never drops the protected (open) entry when over the cap", async () => {
    for (let i = 0; i < 100; i++) await saveEntry(entry(String(i), 1000 + i));
    await saveEntry(entry("new", 5000), ["0"]);
    const ids = (await listHistory()).map((e) => e.id);
    expect(ids).toContain("0");
    expect(ids).not.toContain("1");
  });

  it("renames, duplicates and deletes", async () => {
    await saveEntry(entry("a", 1));
    await renameEntry("a", "My pick");
    expect((await getEntry("a"))?.title).toBe("My pick");

    const copy = await duplicateEntry("a");
    expect(copy?.id).not.toBe("a");
    expect(copy?.title).toBe("My pick (copy)");
    expect(copy?.versions).toHaveLength(1);
    expect(await listHistory()).toHaveLength(2);

    await deleteEntry("a");
    expect(await getEntry("a")).toBeUndefined();
    await clearHistory();
    expect(await listHistory()).toHaveLength(0);
  });
});
