import type { ArchitectureInput, ThreatAnalysisOptions, ThreatReport, LLMProvider } from "../types.js";
import type { ThreatAnalysisPipeline } from "./pipeline.interface.js";
import { buildPass1Prompt } from "../prompts/pass1-stride.js";
import { buildPass2Prompt } from "../prompts/pass2-dread.js";
import { Pass1OutputSchema } from "../schemas/pass1-output.schema.js";
import { Pass2OutputSchema } from "../schemas/pass2-output.schema.js";
import { parseLLMJson, LLMParseError } from "../utils/parse-llm-json.js";
import { withRetry } from "../utils/retry.js";

const DEFAULTS = {
  maxThreats: 5,
  refineMode: false,
  pass1Temperature: 0.3,
  pass2Temperature: 0.1,
  timeoutMs: 45_000,
  maxRetries: 2,
} as const;

export class LLMThreatPipeline implements ThreatAnalysisPipeline {
  constructor(private readonly provider: LLMProvider) {}

  async analyze(input: ArchitectureInput, options: ThreatAnalysisOptions = {}): Promise<ThreatReport> {
    const opts = { ...DEFAULTS, ...options };
    const startTime = Date.now();

    // Pass 1: STRIDE generation
    const pass1Result = await withRetry(
      () => this.provider.complete({
        ...buildPass1Prompt(input),
        temperature: opts.pass1Temperature,
        maxTokens: 4096,
        signal: AbortSignal.timeout(opts.timeoutMs),
      }),
      opts.maxRetries
    );
    const pass1Raw = parseLLMJson(pass1Result.text);
    const pass1Parsed = Pass1OutputSchema.safeParse(pass1Raw);
    if (!pass1Parsed.success)
      throw new LLMParseError(`Pass 1 schema validation failed: ${pass1Parsed.error.message}`);
    const pass1Output = pass1Parsed.data;

    // Pass 2: DREAD ranking + quality filter
    const pass2Result = await withRetry(
      () => this.provider.complete({
        ...buildPass2Prompt(input, pass1Output),
        temperature: opts.pass2Temperature,
        maxTokens: 4096,
        signal: AbortSignal.timeout(opts.timeoutMs),
      }),
      opts.maxRetries
    );
    const pass2Raw = parseLLMJson(pass2Result.text);
    const pass2Parsed = Pass2OutputSchema.safeParse(pass2Raw);
    if (!pass2Parsed.success)
      throw new LLMParseError(`Pass 2 schema validation failed: ${pass2Parsed.error.message}`)
    const pass2Output = pass2Parsed.data;

    // Recompute DREAD totals arithmetically (LLMs sometimes miscalculate)
    const threats = pass2Output.threats
      .map((t) => ({
        ...t,
        dread: {
          ...t.dread,
          total: Math.round(
            ((t.dread.damage + t.dread.reproducibility + t.dread.exploitability +
              t.dread.affectedUsers + t.dread.discoverability) / 5) * 10
          ) / 10,
        },
      }))
      .sort((a, b) => b.dread.total - a.dread.total)
      .slice(0, opts.maxThreats);

    return {
      generatedAt: new Date().toISOString(),
      architectureSummary: pass1Output.architectureSummary,
      assumptionsMade: pass1Output.assumptionsMade,
      threats,
      metadata: {
        provider: this.provider.name,
        model: this.provider.model,
        pass1TokensUsed: pass1Result.usage.totalTokens,
        pass2TokensUsed: pass2Result.usage.totalTokens,
        totalDurationMs: Date.now() - startTime,
      },
    };
  }
}
