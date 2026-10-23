import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError, type ModelMessage } from "ai";
import { z } from "zod";
import { buildUserPrompt, SYSTEM_PROMPT, type GenerateRequest } from "./letter-prompt";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const schema = z.object({
  letter: z.string(),
  detected_company: z.string(),
  detected_title: z.string(),
  notes: z.array(z.string()),
});

// Best-effort in-memory rate limit (per worker instance).
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function statusOf(err: unknown): number | undefined {
  const e = err as { statusCode?: number; status?: number; cause?: unknown };
  return e?.statusCode ?? e?.status ?? (e?.cause ? statusOf(e.cause) : undefined);
}

export async function handleGenerate(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon";
  if (rateLimited(ip)) {
    return json({ error: "You've hit the hourly limit. Please try again a bit later." }, 429);
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (!body.resume?.trim()) return json({ error: "Resume text is missing." }, 400);
  if (!body.jobText?.trim() && !(body.images?.length > 0)) {
    return json({ error: "Add the job posting text or a screenshot." }, 400);
  }
  const images = (body.images ?? []).slice(0, 5).filter((d) => d.startsWith("data:image/"));

  const content: Array<
    { type: "text"; text: string } | { type: "image"; image: URL }
  > = [{ type: "text", text: buildUserPrompt(body) }];
  for (const img of images) content.push({ type: "image", image: new URL(img) });
  const messages: ModelMessage[] = [{ role: "user", content }];

  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: SYSTEM_PROMPT,
      messages,
      abortSignal: request.signal,
      maxRetries: 0,
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    return json(output);
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      return json({ error: "The AI returned an unexpected response. Please try again." }, 502);
    }
    const status = statusOf(err);
    console.error("generate failed", status, err);
    if (status === 429) return json({ error: "The AI is busy right now. Please retry in a moment." }, 429);
    if (status === 402) return json({ error: "AI credits have run out for this app." }, 402);
    if (status === 403) return json({ error: "The AI declined this request." }, 403);
    if (request.signal.aborted) return json({ error: "Cancelled" }, 499);
    return json({ error: "Something went wrong while drafting. Please try again." }, 500);
  }
}
