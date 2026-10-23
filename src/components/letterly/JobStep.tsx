import { useEffect, useState } from "react";
import { ImagePlus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dropzone } from "./Dropzone";
import type { JobState } from "./Wizard";

const MAX_IMAGES = 5;

export function JobStep({
  job,
  setJob,
  onBack,
  onNext,
}: {
  job: JobState;
  setJob: (fn: (j: JobState) => JobState) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [error, setError] = useState("");

  const addImages = async (files: File[]) => {
    setError("");
    const { compressImage } = await import("@/lib/files");
    for (const f of files) {
      try {
        const data = await compressImage(f);
        setJob((j) =>
          j.images.length >= MAX_IMAGES ? j : { ...j, images: [...j.images, data] },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't read that image.");
      }
    }
  };

  useEffect(() => {
    if (job.tab !== "image") return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        void addImages(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.tab]);

  const ready = job.text.trim().length > 20 || job.images.length > 0;

  return (
    <Card className="rounded-2xl border-border p-5 shadow-soft sm:p-8">
      <h2 className="text-xl font-semibold text-foreground">The job posting</h2>
      <p className="mt-1 text-sm text-muted-foreground">Paste the description, or add screenshots of it.</p>

      <Tabs value={job.tab} onValueChange={(v) => setJob((j) => ({ ...j, tab: v as JobState["tab"] }))} className="mt-5">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="text">Paste text</TabsTrigger>
          <TabsTrigger value="image">Upload screenshot</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-4">
          <Textarea
            value={job.text}
            onChange={(e) => setJob((j) => ({ ...j, text: e.target.value }))}
            placeholder="Paste the full job description here…"
            className="min-h-72 text-sm"
          />
        </TabsContent>
        <TabsContent value="image" className="mt-4">
          <Dropzone accept="image/png,image/jpeg,image/webp" multiple onFiles={addImages} disabled={job.images.length >= MAX_IMAGES}>
            <ImagePlus className="h-8 w-8 text-primary" />
            <p className="mt-3 font-medium text-foreground">Drop screenshots, click to browse, or press Ctrl/⌘+V</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG or JPG · up to {MAX_IMAGES} images for long postings</p>
          </Dropzone>
          {job.images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {job.images.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={src} alt={`Job posting screenshot ${i + 1}`} className="h-36 w-full object-cover object-top" />
                  <button
                    type="button"
                    aria-label="Remove screenshot"
                    onClick={() => setJob((j) => ({ ...j, images: j.images.filter((_, k) => k !== i) }))}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-foreground/80 text-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && (
        <div className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="company">Company name <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="company" className="mt-1.5" placeholder="Auto-detected if blank" value={job.company} onChange={(e) => setJob((j) => ({ ...j, company: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="title">Job title <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="title" className="mt-1.5" placeholder="Auto-detected if blank" value={job.title} onChange={(e) => setJob((j) => ({ ...j, title: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="extra">Anything else I should mention? <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="extra" className="mt-1.5" placeholder="e.g. I'm relocating to Austin, or emphasize my leadership experience" value={job.extra} onChange={(e) => setJob((j) => ({ ...j, extra: e.target.value }))} maxLength={300} />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" size="lg" onClick={onBack}>Back</Button>
        <Button size="lg" disabled={!ready} onClick={onNext}>Write my letter</Button>
      </div>
    </Card>
  );
}
