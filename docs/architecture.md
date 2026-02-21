# ThreatLens — Architecture Reference

## System overview

ThreatLens is a stateless web application. There is no database, no user accounts, and no persisted state beyond the in-memory rate limiter. Every request is independent.

```
Browser
  │
  │  POST /api/analyze  {input, provider?, apiKey?, options?}
  ▼
Next.js API Route (apps/web/src/app/api/analyze/route.ts)
  │  validates input (Zod)
  │  checks rate limit (in-memory Map)
  │  resolves API key
  ▼
LLMThreatPipeline (packages/core/src/pipeline/llm-pipeline.ts)
  │
  ├── Pass 1: LLMProvider.complete(pass1Prompt)
  │     systemPrompt: STRIDE identification rules
  │     temperature: 0.3  maxTokens: 4096
  │     → raw JSON → parseLLMJson → Pass1OutputSchema (Zod)
  │
  └── Pass 2: LLMProvider.complete(pass2Prompt)
        systemPrompt: DREAD scoring + quality filter rules
        temperature: 0.1  maxTokens: 4096
        → raw JSON → parseLLMJson → Pass2OutputSchema (Zod)
        → recompute DREAD totals arithmetically
        → sort by total desc → slice top 5
  │
  ▼
ThreatReport JSON  →  NextResponse.json({ success: true, report })
  │
  ▼
Browser: useAnalyze hook sets state → React renders ThreatReport component
```

---

## Monorepo layout

```
pnpm-workspace.yaml         declares packages/* and apps/*
tsconfig.base.json          shared TS config (strict, ES2022, NodeNext)
packages/core/              @threat-modeller/core  — "type": "module"
apps/web/                   @threat-modeller/web   — Next.js 14
```

pnpm installs all deps into `node_modules/.pnpm/` (virtual store). Each workspace package gets its own `node_modules/` with symlinks into the store. `apps/web/node_modules/@threat-modeller/core` is a symlink to `../../../../packages/core`.

---

## packages/core — file by file

### `src/types.ts`
Single source of truth for every TypeScript interface. Key types:
- `ArchitectureInput` — user description + optional refinements
- `Threat` — one scored, ranked threat with all fields
- `ThreatReport` — full pipeline output including metadata
- `LLMProvider` — interface implemented by all three providers
- `LLMProviderError` — typed error with `code: LLMErrorCode` and `retryable: boolean`
- `AnalyzeRequest` / `AnalyzeResponse` / `AnalyzeErrorResponse` — API wire types

### `src/schemas/pass1-output.schema.ts`
Zod schema for Pass 1 LLM output. Key constraints:
- `threats`: 1–10 items (prompt asks for 7–10; schema is more lenient to avoid rejecting valid responses)
- `id`: must match `/^T\d+$/`
- `title`: 5–120 chars (80 was too strict — LLM regularly generates longer specific titles)
- `scenario`: min 50 chars

### `src/schemas/pass2-output.schema.ts`
Zod schema for Pass 2 LLM output. Key constraints:
- `threats`: 1–5 items
- `businessImpact`: min 20 chars
- `mitigations`: 1–3 items, each min 10 chars
- `dread.total`: trusted from LLM but **recomputed arithmetically in the pipeline** — LLMs make arithmetic errors

### `src/prompts/pass1-stride.ts`
System prompt for STRIDE identification. Hard rules enforced in the prompt:
- 7–10 threats, never fewer
- Every threat MUST name an actual component from the input
- No mitigations in this pass
- Output ONLY valid JSON (no markdown fences, no prose)

### `src/prompts/pass2-dread.ts`
System prompt for DREAD scoring. Hard rules:
- Quality filter: reject generic threats, reject duplicates, reject threats whose scenario doesn't name a component
- Each mitigation: ONE concise sentence, ≤30 words, names specific component/library/config
- Business impact: ONE sentence, ≤30 words, names specific regulation or consequence
- Sort by `dread.total` descending, return at most 5

> **Why concise mitigations?** The original prompt asked for 1–3 sentence mitigations. Pass 2 was generating ~5,000 output tokens — exceeding the 60s limit. After tightening to single-sentence mitigations, Pass 2 output dropped to ~2,500–3,000 tokens.

### `src/utils/parse-llm-json.ts`
Extracts JSON from LLM responses that may be wrapped in markdown fences or surrounded by prose. Strategy:
1. Strip ` ```json ... ``` ` fences if present
2. Regex-extract the outermost `{...}` or `[...]`
3. `JSON.parse()` the candidate

Throws `LLMParseError` (not a generic Error) so the API route can return a specific 502 response.

### `src/utils/retry.ts`
Exponential backoff retry: 1s → 2s → 4s. Only retries `LLMProviderError` with `retryable: true`. Default: 2 retries (3 total attempts).

### `src/providers/anthropic.provider.ts`
Wraps `@anthropic-ai/sdk`. Catches:
- 429 → `RATE_LIMITED` (retryable)
- 401 → `INVALID_API_KEY` (not retryable)
- ≥500 → `PROVIDER_ERROR` (retryable)
- `AbortError` OR `TimeoutError` → `TIMEOUT` (not retryable)

> **Node.js 17+ gotcha:** `AbortSignal.timeout()` fires a `TimeoutError` (DOMException), not an `AbortError`. Both names are checked.

### `src/providers/openai.provider.ts`
Same error handling as Anthropic. Uses `response_format: { type: "json_object" }` to hint JSON output.

### `src/providers/ollama.provider.ts`
Uses the OpenAI SDK pointed at `http://localhost:11434/v1` (configurable via `OLLAMA_BASE_URL`). Ollama doesn't validate API keys — the SDK requires one so we pass `"ollama"` as a dummy. Does NOT set `response_format: json_object` (not all Ollama models support it). Additional error handling:
- 404 → helpful message: `ollama pull <model>`
- `ECONNREFUSED` / `fetch failed` → helpful message: `ollama serve`

### `src/pipeline/llm-pipeline.ts`
Core orchestration. Defaults:
```typescript
maxThreats: 5
pass1Temperature: 0.3   // slightly creative for generation
pass2Temperature: 0.1   // deterministic for scoring
timeoutMs: 45_000       // per-pass AbortSignal timeout
maxRetries: 2
```

After Pass 2, DREAD totals are **recomputed**:
```typescript
total = Math.round(((D + R + E + A + Di) / 5) * 10) / 10
```
The LLM's `total` field is ignored.

Zod validation uses `.safeParse()` — failures throw `LLMParseError` (not `ZodError`) so they're caught by the route's error handler.

---

## apps/web — file by file

### `src/app/api/analyze/route.ts`
- `export const maxDuration = 60` — Vercel function timeout
- `export const dynamic = "force-dynamic"` — prevents static caching
- Validates request body with Zod `BodySchema`
- Rate limits free-tier requests (no `apiKey`) using in-memory limiter
- Ollama provider skips API key requirement entirely
- Error mapping: `LLMProviderError.code` → HTTP status (429/401/400/502/504)
- `LLMParseError` → 502 with generic message (logged server-side with full detail)

### `src/lib/rate-limiter.ts`
In-memory `Map<ip, {count, windowStart}>`. 24-hour sliding window. Every 1000 calls, expired entries are pruned. **Not shared across instances** — acceptable at MVP scale, replace with Upstash Redis for horizontal scaling.

### `src/app/page.tsx`
Single page, no state management library. State:
- `description: string` — textarea content
- `refinements: Refinements` — optional context fields
- `apiKey: string`, `provider` — BYOK settings
- `state` from `useAnalyze` — `idle | loading | success | error`

The `disabled` prop on `ArchitectureInput` is `false` (not `state.status === "loading"`) because TypeScript narrows the type inside the `(idle || error)` conditional render — comparing to `"loading"` in that block would always be false.

### `src/hooks/useAnalyze.ts`
Manages the full fetch lifecycle. On network error (fetch throws), sets `err.code = "NETWORK_ERROR"`.

### `src/hooks/useExport.ts`
Dynamically imports `pdf.ts` and `markdown.ts` (both are large, client-only) to avoid including them in the initial bundle.

### `src/lib/export/pdf.ts`
Client-side PDF generation with jsPDF + jspdf-autotable. Dynamic import only — never imported at SSR time. Summary table on page 1, one page per threat with DREAD breakdown table, scenario, business impact, and mitigations.

### `src/lib/export/markdown.ts`
Generates a `.md` string and triggers a browser download via a temporary `<a>` element with an object URL.

---

## Data flow — Pass 1 → Pass 2

**Pass 1 input** (user prompt):
```
--- ARCHITECTURE DESCRIPTION ---
<user's text>
--- END ARCHITECTURE DESCRIPTION ---

Identify 7–10 specific threats using STRIDE...
```

**Pass 1 output** (JSON):
```json
{
  "architectureSummary": "...",
  "assumptionsMade": ["..."],
  "threats": [
    { "id": "T1", "title": "...", "strideCategory": "...",
      "affectedComponent": "...", "scenario": "...", "attackComplexity": "..." }
  ]
}
```

**Pass 2 input**: Pass 1 threats JSON + original architecture description.

**Pass 2 output** (JSON):
```json
{
  "threats": [
    { "id": "T1", "title": "...", "strideCategory": "...",
      "affectedComponent": "...", "scenario": "...", "attackComplexity": "...",
      "businessImpact": "...", "mitigations": ["..."],
      "dread": { "damage": 9, "reproducibility": 7, "exploitability": 6,
                 "affectedUsers": 10, "discoverability": 5, "total": 7.4 } }
  ]
}
```

Pipeline then recomputes `total` from the five fields arithmetically and re-sorts.

---

## Docker architecture

### Multi-stage Dockerfile

| Stage | Base | Purpose |
|---|---|---|
| `base` | `node:20-alpine` | pnpm setup, shared layer |
| `deps` | `base` | `pnpm install --frozen-lockfile` only |
| `builder` | `base` | Copies node_modules from deps, compiles core, builds Next.js |
| `runner` | `node:20-alpine` | Copies `.next/standalone` only — no build tools |

### Why standalone output?

`apps/web/node_modules/@threat-modeller/core` is a pnpm symlink to `../../../../packages/core`. Docker's `COPY --from` preserves symlinks, but the pnpm virtual store structure makes it fragile to copy selectively.

`output: "standalone"` in `next.config.mjs` tells Next.js to trace all runtime dependencies and copy them into `.next/standalone/`. This includes `packages/core/dist/` (the compiled library). The runner stage copies only this self-contained folder — no symlinks, no pnpm, no TypeScript compiler.

`outputFileTracingRoot` is set to the monorepo root so Next.js traces across package boundaries.

### docker-compose.yml

Two services:
- `app`: built from Dockerfile, env vars injected at runtime
- `ollama`: `ollama/ollama:latest`, volume-mounted model storage

`OLLAMA_BASE_URL` is set to `http://ollama:11434/v1` (Docker Compose service DNS) in the app service, overriding the default `http://localhost:11434/v1`.
