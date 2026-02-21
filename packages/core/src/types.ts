// ─── Input ─────────────────────────────────────────────────────────────────

export interface ArchitectureInput {
  /** Free-form architecture description. Min 50 chars, max 10,000 chars. */
  description: string;
  /**
   * Optional structured overrides for "Refine mode". When absent, the LLM
   * makes intelligent assumptions and lists them in assumptionsMade.
   */
  refinements?: {
    dataSensitivity?: string;
    authModel?: string;
    deploymentEnvironment?: string;
    businessContext?: string;
    existingControls?: string;
  };
}

// ─── STRIDE + DREAD ────────────────────────────────────────────────────────

export type StrideCategory =
  | "Spoofing"
  | "Tampering"
  | "Repudiation"
  | "Information Disclosure"
  | "Denial of Service"
  | "Elevation of Privilege";

export interface DreadScore {
  damage: number;          // 1–10
  reproducibility: number; // 1–10
  exploitability: number;  // 1–10
  affectedUsers: number;   // 1–10
  discoverability: number; // 1–10
  total: number;           // arithmetic mean, rounded to 1 decimal
}

// ─── Output ────────────────────────────────────────────────────────────────

export interface Threat {
  id: string;
  title: string;
  strideCategory: StrideCategory;
  affectedComponent: string;
  scenario: string;
  businessImpact: string;
  mitigations: string[];
  attackComplexity: "Low" | "Medium" | "High";
  dread: DreadScore;
}

export interface ThreatReport {
  generatedAt: string;
  architectureSummary: string;
  assumptionsMade: string[];
  threats: Threat[];
  metadata: {
    provider: "anthropic" | "openai";
    model: string;
    pass1TokensUsed?: number;
    pass2TokensUsed?: number;
    totalDurationMs: number;
  };
}

// ─── LLM Provider ──────────────────────────────────────────────────────────

export interface LLMCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
}

export interface LLMCompletionResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface LLMProvider {
  readonly name: "anthropic" | "openai";
  readonly model: string;
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}

// ─── Pipeline ──────────────────────────────────────────────────────────────

/**
 * The core abstraction. MVP: LLMThreatPipeline implements this.
 * Future Option B: DeterministicThreatPipeline will also implement this.
 * All callers (API route, CLI, Slackbot, GitHub Action) depend only on this interface.
 */
export interface ThreatAnalysisPipeline {
  analyze(input: ArchitectureInput, options?: ThreatAnalysisOptions): Promise<ThreatReport>;
}

export interface ThreatAnalysisOptions {
  maxThreats?: number;         // default: 5, max: 5
  refineMode?: boolean;        // default: false
  pass1Temperature?: number;   // default: 0.3
  pass2Temperature?: number;   // default: 0.1
  timeoutMs?: number;          // default: 55000
  maxRetries?: number;         // default: 2
}

// ─── Errors ────────────────────────────────────────────────────────────────

export type LLMErrorCode =
  | "RATE_LIMITED"
  | "INVALID_API_KEY"
  | "CONTEXT_TOO_LONG"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR";

export class LLMProviderError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}

// ─── API Wire Types ────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  input: ArchitectureInput;
  apiKey?: string;
  provider?: "anthropic" | "openai";
  options?: Pick<ThreatAnalysisOptions, "maxThreats" | "refineMode">;
}

export interface AnalyzeResponse {
  success: true;
  report: ThreatReport;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    byokRequired?: boolean;
    retryAfterSeconds?: number;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp seconds
  limit: number;
}
