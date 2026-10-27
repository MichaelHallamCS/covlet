import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { Focus, Length, Tone } from "@/lib/letter-prompt";
import { makeTitle, MAX_JOB_TEXT, type HistoryEntry } from "@/lib/history";
import { ResumeStep } from "./ResumeStep";
import { JobStep } from "./JobStep";
import { LetterStep } from "./LetterStep";
import { HistorySidebar } from "./HistorySidebar";
import { useHistory } from "./useHistory";

export interface JobState {
  text: string;
  images: string[];
  company: string;
  title: string;
  extra: string;
  tab: "text" | "image";
}
export const emptyJob: JobState = { text: "", images: [], company: "", title: "", extra: "", tab: "text" };

export interface LetterOpts {
  tone: Tone;
  length: Length;
  focus: Focus;
}

export interface Version {
  id: string;
  label: string;
  letter: string;
  notes: string[];
  options: LetterOpts;
  feedback?: string;
  createdAt: number;
}

/** One application session = one history entry. */
export interface Session {
  entryId: string | null;
  createdAt: number;
  versions: Version[];
  current: number;
  options: LetterOpts;
  customTitle: string | null;
  resumeLabel: string;
  usedScreenshots: boolean;
  restored: boolean;
}

export const newSession = (): Session => ({
  entryId: null,
  createdAt: 0,
  versions: [],
  current: 0,
  options: { tone: "professional", length: "standard", focus: "balanced" },
  customTitle: null,
  resumeLabel: "",
  usedScreenshots: false,
  restored: false,
});

function toEntry(s: Session, job: JobState, updatedAt: number): HistoryEntry {
  return {
    id: s.entryId!,
    title: s.customTitle ?? makeTitle(job.title, job.company),
    company: job.company,
    jobTitle: job.title,
    jobText: job.text.slice(0, MAX_JOB_TEXT),
    extra: job.extra,
    resumeLabel: s.resumeLabel,
    usedScreenshots: s.usedScreenshots,
    options: s.options,
    versions: s.versions.map((v) => ({ ...v, notes: v.notes.join("\n") })),
    activeVersionId: s.versions[s.current]?.id ?? "",
    createdAt: s.createdAt,
    updatedAt,
  };
}

function fromEntry(e: HistoryEntry): { session: Session; job: JobState } {
  const versions: Version[] = e.versions.map((v) => ({
    ...v,
    options: v.options as LetterOpts,
    notes: v.notes ? v.notes.split("\n").filter(Boolean) : [],
  }));
  return {
    session: {
      entryId: e.id,
      createdAt: e.createdAt,
      versions,
      current: Math.max(0, versions.findIndex((v) => v.id === e.activeVersionId)),
      options: e.options as LetterOpts,
      customTitle: e.title !== makeTitle(e.jobTitle, e.company) ? e.title : null,
      resumeLabel: e.resumeLabel ?? "",
      usedScreenshots: e.usedScreenshots,
      restored: true,
    },
    job: { text: e.jobText, images: [], company: e.company, title: e.jobTitle, extra: e.extra, tab: "text" },
  };
}

const snapshot = (s: Session, job: JobState) => JSON.stringify(toEntry(s, job, 0));

const STORAGE_KEY = "covlet.resume";
const STEPS = ["Resume", "Job posting", "Your letter"];

export function Wizard({ hero }: { hero?: ReactNode }) {
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState("");
  const [job, setJob] = useState<JobState>(emptyJob);
  const [session, setSession] = useState<Session>(newSession);
  const [loaded, setLoaded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const history = useHistory();
  const lastSaved = useRef("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setResume(saved);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    if (resume) localStorage.setItem(STORAGE_KEY, resume);
    else localStorage.removeItem(STORAGE_KEY);
  }, [resume, loaded]);

  // Auto-save the open session (debounced) whenever its saved content changes.
  useEffect(() => {
    if (!session.entryId || !session.versions.length || !history.available) return;
    const snap = snapshot(session, job);
    if (snap === lastSaved.current) return;
    const t = setTimeout(() => {
      lastSaved.current = snap;
      void history.save(toEntry(session, job, Date.now()));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, job.text, job.company, job.title, job.extra, history.available]);

  const startNew = () => {
    setSession(newSession());
    setJob(emptyJob);
    lastSaved.current = "";
    setResetKey((k) => k + 1);
    setStep(resume.trim() ? 1 : 0);
  };

  const openEntry = async (id: string) => {
    const e = await history.get(id);
    if (!e) return;
    const restored = fromEntry(e);
    lastSaved.current = snapshot(restored.session, restored.job);
    setSession(restored.session);
    setJob(restored.job);
    setResetKey((k) => k + 1);
    setStep(2);
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    void history.clear();
    setResume("");
    setJob(emptyJob);
    setSession(newSession());
    lastSaved.current = "";
    setStep(0);
    setResetKey((k) => k + 1);
  };

  const showSidebar = history.entries.length > 0 || step > 0;

  return (
    <SidebarProvider defaultOpen>
      {showSidebar && (
        <HistorySidebar
          entries={history.entries}
          available={history.available}
          activeId={session.entryId}
          onOpen={(id) => void openEntry(id)}
          onNew={startNew}
          onRename={(id, title) => {
            if (id === session.entryId) setSession((s) => ({ ...s, customTitle: title.trim() || null }));
            void history.rename(id, title);
          }}
          onDelete={(id) => {
            if (id === session.entryId) startNew();
            void history.remove(id);
          }}
          onDuplicate={(id) => void history.duplicate(id, session.entryId ? [session.entryId] : [])}
          onClearAll={() => {
            void history.clear();
            if (session.entryId) startNew();
          }}
        />
      )}
      <SidebarInset className="min-w-0 bg-background">
        <header className="bg-hero">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-5 pt-6">
            {showSidebar && <SidebarTrigger aria-label="Toggle letter history" className="-ml-1" />}
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-letter text-lg text-primary-foreground">
                C
              </span>
              Covlet
            </div>
          </div>
          {hero}
        </header>
        <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
          {!history.available && (
            <p className="mb-4 text-center text-xs text-muted-foreground">History isn't available in this browser.</p>
          )}
          <ol className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-2">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              const reachable = i < step || (i === 1 && resume.trim());
              return (
                <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                  <button
                    type="button"
                    disabled={!reachable && !active}
                    onClick={() => reachable && setStep(i)}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors",
                        active && "border-primary bg-primary text-primary-foreground",
                        done && "border-primary bg-primary-soft text-primary",
                        !active && !done && "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={cn("hidden font-medium sm:inline", active ? "text-foreground" : "text-muted-foreground")}>
                      {label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />}
                </li>
              );
            })}
          </ol>

          <div className={step === 0 ? "" : "hidden"}>
            <ResumeStep resume={resume} setResume={setResume} onClear={clearAll} onNext={() => setStep(1)} />
          </div>
          <div className={step === 1 ? "" : "hidden"}>
            <JobStep job={job} setJob={setJob} onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </div>
          <div className={step === 2 ? "" : "hidden"}>
            <LetterStep
              key={resetKey}
              active={step === 2}
              resume={resume}
              job={job}
              setJob={setJob}
              session={session}
              setSession={setSession}
              onBack={() => setStep(1)}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
