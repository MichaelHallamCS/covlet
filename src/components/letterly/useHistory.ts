import { useCallback, useEffect, useState } from "react";
import * as h from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";

/** Loads letter history in an effect and keeps it in sync after writes. Never throws. */
export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [available, setAvailable] = useState(true);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setEntries(await h.listHistory());
    } catch {
      setAvailable(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    <T,>(fn: () => Promise<T>) =>
      (async () => {
        try {
          const r = await fn();
          await refresh();
          return r;
        } catch {
          setAvailable(false);
          return undefined;
        }
      })(),
    [refresh],
  );

  return {
    entries,
    available,
    ready,
    get: (id: string) => run(() => h.getEntry(id)),
    save: (e: HistoryEntry, protect?: string[]) => run(() => h.saveEntry(e, protect)),
    remove: (id: string) => run(() => h.deleteEntry(id)),
    clear: () => run(() => h.clearHistory()),
    rename: (id: string, title: string) => run(() => h.renameEntry(id, title)),
    duplicate: (id: string, protect?: string[]) => run(() => h.duplicateEntry(id, protect)),
  };
}
