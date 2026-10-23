import { createFileRoute } from "@tanstack/react-router";
import { handleGenerate } from "@/lib/letter.server";

export const Route = createFileRoute("/api/generate")({
  server: { handlers: { POST: ({ request }) => handleGenerate(request) } },
});
