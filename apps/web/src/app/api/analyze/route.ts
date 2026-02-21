export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { LLMThreatPipeline, createProvider, LLMProviderError, LLMParseError } from "@threat-modeller/core";
import { checkRateLimit } from "@/lib/rate-limiter";
import { z } from "zod";

const BodySchema = z.object({
  input: z.object({
    description: z.string()
      .min(50, "Description must be at least 50 characters")
      .max(10_000, "Description must not exceed 10,000 characters"),
    refinements: z.object({
      dataSensitivity: z.string().optional(),
      authModel: z.string().optional(),
      deploymentEnvironment: z.string().optional(),
      businessContext: z.string().optional(),
      existingControls: z.string().optional(),
    }).optional(),
  }),
  apiKey: z.string().optional(),
  provider: z.enum(["anthropic", "openai", "ollama"]).default("anthropic"),
  options: z.object({
    maxThreats: z.number().int().min(1).max(5).default(5),
    refineMode: z.boolean().default(false),
  }).optional(),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0]!.trim() : "127.0.0.1";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return error(400, "VALIDATION_ERROR", "Invalid JSON body"); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return error(400, "VALIDATION_ERROR", parsed.error.errors[0]?.message ?? "Invalid request");
  }

  const { input, apiKey, provider, options } = parsed.data;

  // Rate limit free-tier requests only
  const disableRL = process.env["DISABLE_RATE_LIMIT"] === "true";
  if (!apiKey && !disableRL) {
    const rl = checkRateLimit(getClientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED",
          message: "Free tier limit reached (3/day). Add your Anthropic API key to continue.",
          byokRequired: true,
          retryAfterSeconds: rl.resetAt - Math.floor(Date.now() / 1000) } },
        { status: 429, headers: { "Retry-After": String(rl.resetAt - Math.floor(Date.now() / 1000)) } }
      );
    }
  }

  // Ollama is local — no API key needed
  if (provider !== "ollama") {
    const resolvedKey = apiKey ?? (provider === "anthropic"
      ? process.env["ANTHROPIC_API_KEY"]
      : process.env["OPENAI_API_KEY"]);
    if (!resolvedKey) return error(500, "INTERNAL_ERROR", "Server API key not configured");
  }

  const resolvedKey = provider === "ollama"
    ? undefined
    : (apiKey ?? (provider === "anthropic"
        ? process.env["ANTHROPIC_API_KEY"]
        : process.env["OPENAI_API_KEY"]));

  const pipeline = new LLMThreatPipeline(createProvider({ providerName: provider, apiKey: resolvedKey }));

  try {
    const report = await pipeline.analyze(input, {
      maxThreats: options?.maxThreats ?? 5,
      refineMode: options?.refineMode ?? false,
    });
    return NextResponse.json({ success: true, report });
  } catch (err) {
    if (err instanceof LLMProviderError) {
      const statusMap: Record<string, number> = {
        RATE_LIMITED: 429, INVALID_API_KEY: 401, CONTEXT_TOO_LONG: 400,
        INVALID_RESPONSE: 502, TIMEOUT: 504, PROVIDER_ERROR: 502, NETWORK_ERROR: 502,
      };
      return error(statusMap[err.code] ?? 500, err.code, err.message);
    }
    if (err instanceof LLMParseError) {
      console.error("LLMParseError:", err.message);
      return error(502, "INVALID_RESPONSE", "The AI returned an unexpected format. Please try again.");
    }
    console.error("Unhandled error:", err);
    return error(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

function error(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
