import { useState } from "react";
import { FileText, Loader2, Trash2, ChevronDown, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dropzone } from "./Dropzone";
import { wordCount } from "@/lib/letter-prompt";

export function ResumeStep({
  resume,
  setResume,
  onClear,
  onNext,
}: {
  resume: string;
  setResume: (s: string) => void;
  onClear: () => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [open, setOpen] = useState(true);

  const handle = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    setBusy(true);
    try {
      const { extractResumeText } = await import("@/lib/files");
      const text = await extractResumeText(f);
      setResume(text);
      setFileName(f.name);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  };

  const hasResume = resume.trim().length > 0;

  return (
    <Card className="rounded-2xl border-border p-5 shadow-soft sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your resume</h2>
          <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, or TXT up to 5MB. It never leaves your browser except to draft the letter.</p>
        </div>
        {hasResume && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Trash2 className="h-4 w-4" /> Clear my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear your data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your saved resume and all letter history from this browser.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClear}>Clear everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {!pasteMode && (
        <Dropzone accept=".pdf,.docx,.txt,application/pdf,text/plain" onFiles={handle} disabled={busy}>
          {busy ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
          <p className="mt-3 font-medium text-foreground">
            {busy ? "Reading your resume…" : hasResume ? "Drop a new file to replace" : "Drag your resume here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PDF · DOCX · TXT</p>
        </Dropzone>
      )}

      <button
        type="button"
        onClick={() => setPasteMode((p) => !p)}
        className="mt-3 text-sm font-medium text-primary hover:underline"
      >
        {pasteMode ? "Upload a file instead" : "Paste resume text instead"}
      </button>

      {error && (
        <div className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {pasteMode ? (
        <Textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your full resume text here…"
          className="mt-4 min-h-72 text-sm"
        />
      ) : (
        hasResume && (
          <Collapsible open={open} onOpenChange={setOpen} className="mt-5 rounded-xl border border-border">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                {fileName || "Saved resume"}
                <span className="font-normal text-muted-foreground">· {wordCount(resume)} words</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border p-3">
              <p className="mb-2 text-xs text-muted-foreground">Check it parsed correctly — you can edit it here.</p>
              <Textarea value={resume} onChange={(e) => setResume(e.target.value)} className="min-h-64 text-sm" />
            </CollapsibleContent>
          </Collapsible>
        )
      )}

      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!hasResume} onClick={onNext}>
          Continue
        </Button>
      </div>
    </Card>
  );
}
