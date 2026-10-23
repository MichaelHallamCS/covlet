import { useEffect, useRef, useState } from "react";
import { Copy, Download, FileDown, RefreshCw, Sparkles, AlertCircle, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FOCUSES,
  LENGTHS,
  TONES,
  wordCount,
  type Focus,
  type GenerateRequest,
  type Length,
  type Tone,
} from "@/lib/letter-prompt";
import type { JobState } from "./Wizard";

interface Version {
  letter: string;
  notes: string[];
  label: string;
}

const STATUS = ["Reading the job posting…", "Matching your experience…", "Picking your strongest evidence…", "Drafting…", "Polishing the opening line…"];

export function LetterStep({
  active,
  resume,
  job,
  setJob,
  onBack,
}: {
  active: boolean;
  resume: string;
  job: JobState;
  setJob: (fn: (j: JobState) => JobState) => void;
  onBack: () => void;
}) {
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("standard");
  const [focus, setFocus] = useState<Focus>("balanced");
  const [versions, setVersions] = useState<Version[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; retry?: (() => void) | undefined } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [statusIdx, setStatusIdx] = useState(0);
  const lastInputs = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const inputsKey = JSON.stringify([resume, job.text, job.images.length, job.company, job.title, job.extra]);

  useEffect(() => {
    if (!loading) return;
    setStatusIdx(0);
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS.length), 2200);
    return () => clearInterval(t);
  }, [loading]);

  const generate = async (opts?: { feedback?: string }) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    lastInputs.current = inputsKey;
    const draft = versions[current]?.letter;
    const body: GenerateRequest = {
      resume,
      jobText: job.tab === "text" || !job.images.length ? job.text : job.text,
      images: job.images,
      company: job.company,
      title: job.title,
      extra: job.extra,
      tone,
      length,
      focus,
      feedback: opts?.feedback,
      currentDraft: opts?.feedback ? draft : undefined,
    };
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ msg: data.error ?? "Something went wrong.", retry: res.status === 429 ? undefined : () => generate(opts) });
        return;
      }
      const v: Version = {
        letter: data.letter,
        notes: data.notes ?? [],
        label: opts?.feedback ? "Revised" : TONES[tone],
      };
      setVersions((vs) => {
        setCurrent(vs.length);
        return [...vs, v];
      });
      setJob((j) => ({
        ...j,
        company: j.company || data.detected_company || "",
        title: j.title || data.detected_title || "",
      }));
      if (opts?.feedback) setFeedback("");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError({ msg: "Couldn't reach the server. Check your connection.", retry: () => generate(opts) });
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  };

  useEffect(() => {
    if (active && !loading && lastInputs.current !== inputsKey) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, inputsKey]);

  const v = versions[current];
  const setLetter = (letter: string) =>
    setVersions((vs) => vs.map((x, i) => (i === current ? { ...x, letter } : x)));
  const fileBase = `Cover Letter${job.company ? ` - ${job.company}` : ""}`.replace(/[\\/:*?"<>|]/g, "");

  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
      <Card className="h-fit rounded-2xl border-border p-5 shadow-soft">
        <div className="space-y-4">
          <Control label="Tone" value={tone} onChange={(x) => setTone(x as Tone)} options={TONES} />
          <Control label="Length" value={length} onChange={(x) => setLength(x as Length)} options={LENGTHS} />
          <Control label="Focus" value={focus} onChange={(x) => setFocus(x as Focus)} options={FOCUSES} />
          <Button className="w-full" onClick={() => generate()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Regenerate
          </Button>
        </div>
        <form
          className="mt-6 border-t border-border pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (feedback.trim() && v) void generate({ feedback: feedback.trim() });
          }}
        >
          <label className="text-sm font-medium text-foreground" htmlFor="fb">Regenerate with feedback</label>
          <Input
            id="fb"
            className="mt-1.5"
            placeholder="e.g. make the opening less generic"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={300}
          />
          <Button type="submit" variant="secondary" className="mt-2 w-full" disabled={!feedback.trim() || !v || loading}>
            <Sparkles className="h-4 w-4" /> Apply feedback
          </Button>
        </form>
        <Button variant="ghost" className="mt-4 w-full text-muted-foreground" onClick={onBack}>
          ← Edit job posting
        </Button>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {versions.map((x, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  i === current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
                title={x.label}
              >
                v{i + 1}
              </button>
            ))}
          </div>
          {v && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(v.letter);
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button variant="outline" onClick={async () => (await import("@/lib/files")).downloadDocx(v.letter, resume, fileBase)}>
                <FileDown className="h-4 w-4" /> .docx
              </Button>
              <Button variant="outline" onClick={async () => (await import("@/lib/files")).downloadPdf(v.letter, resume, fileBase)}>
                <Download className="h-4 w-4" /> PDF
              </Button>
            </div>
          )}
        </div>

        <div className="relative rounded-sm bg-paper px-6 py-10 text-paper-foreground shadow-paper sm:px-14 sm:py-14">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col gap-4 rounded-sm bg-paper px-6 py-10 sm:px-14 sm:py-14">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Loader2 className="h-4 w-4 animate-spin" /> {STATUS[statusIdx]}
              </div>
              <Skeleton className="h-4 w-1/3" />
              {[...Array(3)].map((_, p) => (
                <div key={p} className="mt-3 space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              ))}
            </div>
          )}
          {error && !loading ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="mt-3 max-w-sm font-sans text-sm text-foreground">{error.msg}</p>
              {error.retry && (
                <Button className="mt-4" onClick={error.retry}>
                  <RefreshCw className="h-4 w-4" /> Try again
                </Button>
              )}
            </div>
          ) : v ? (
            <textarea
              aria-label="Cover letter"
              value={v.letter}
              onChange={(e) => setLetter(e.target.value)}
              className="field-sizing-content min-h-[32rem] w-full resize-none bg-transparent font-letter text-[1.02rem] leading-[1.75] text-paper-foreground outline-none"
            />
          ) : (
            !loading && <div className="min-h-80" />
          )}
        </div>
        {v && (
          <p className="mt-2 text-right text-xs text-muted-foreground">{wordCount(v.letter)} words</p>
        )}
        {v && v.notes.length > 0 && !loading && (
          <div className="mt-4 rounded-xl border border-warning-border bg-warning p-4 text-sm text-warning-foreground">
            <div className="mb-1.5 flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4" /> Notes
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {v.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Control({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([k, l]) => (
            <SelectItem key={k} value={k}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
