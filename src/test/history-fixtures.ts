import type { HistoryEntry } from "@/lib/history";

export function entry(id: string, updatedAt: number, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id,
    title: `Engineer at Co${id}`,
    company: `Co${id}`,
    jobTitle: "Engineer",
    jobText: "job",
    extra: "",
    resumeLabel: "Jane Doe",
    usedScreenshots: false,
    options: { tone: "professional", length: "standard", focus: "balanced" },
    versions: [{ id: `${id}-v1`, label: "v1", letter: "Dear team", notes: "", options: { tone: "professional", length: "standard", focus: "balanced" }, createdAt: updatedAt }],
    activeVersionId: `${id}-v1`,
    createdAt: updatedAt,
    updatedAt,
    ...extra,
  };
}

