import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResumeStep } from "./ResumeStep";
import { JobStep } from "./JobStep";
import { LetterStep } from "./LetterStep";

export interface JobState {
  text: string;
  images: string[];
  company: string;
  title: string;
  extra: string;
  tab: "text" | "image";
}
export const emptyJob: JobState = { text: "", images: [], company: "", title: "", extra: "", tab: "text" };

const STORAGE_KEY = "letterly.resume";
const STEPS = ["Resume", "Job posting", "Your letter"];

export function Wizard() {
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState("");
  const [job, setJob] = useState<JobState>(emptyJob);
  const [loaded, setLoaded] = useState(false);

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

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setResume("");
    setJob(emptyJob);
    setStep(0);
  };

  return (
    <div>
      <ol className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = i < step || (i === 1 && resume.trim()) ;
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
              {i < STEPS.length - 1 && (
                <span className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <ResumeStep resume={resume} setResume={setResume} onClear={clearAll} onNext={() => setStep(1)} />
      )}
      {step === 1 && <JobStep job={job} setJob={setJob} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
      {step === 2 && <LetterStep resume={resume} job={job} setJob={setJob} onBack={() => setStep(1)} />}
    </div>
  );
}
