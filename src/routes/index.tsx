import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Lock, PenLine } from "lucide-react";
import { Wizard } from "@/components/letterly/Wizard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Letterly — Tailored cover letters in 30 seconds" },
      {
        name: "description",
        content: "Upload your resume, add a job posting, and get a tailored cover letter that never invents experience.",
      },
      { property: "og:title", content: "Letterly — Tailored cover letters in 30 seconds" },
      {
        property: "og:description",
        content: "Upload your resume, add a job posting, and get a tailored cover letter that never invents experience.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <Wizard
        hero={
          <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 text-center sm:pt-16">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Tailored cover letters in <span className="text-primary">30 seconds</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Drop in your resume and a job posting. Get a specific, honest letter you can edit and send.
            </p>
            <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />Never invents experience</li>
              <li className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" />Your resume stays in your browser</li>
              <li className="flex items-center gap-1.5"><PenLine className="h-4 w-4 text-primary" />Edit and export freely</li>
            </ul>
          </div>
        }
      />
    </div>
  );
}
