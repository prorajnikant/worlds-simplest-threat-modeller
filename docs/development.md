# ThreatLens — Development Guide

## First-time setup

```bash
# Requires Node.js 20+ and pnpm 9
npm install -g pnpm@9

git clone <repo>
cd worlds-simplest-threat-modeller

pnpm install               # installs all workspace deps
cp .env.example apps/web/.env.local
# edit apps/web/.env.local and set ANTHROPIC_API_KEY=sk-ant-...

pnpm --filter @threat-modeller/core build   # compile TypeScript library
pnpm dev                                     # start Next.js at localhost:3000
```

---

## Daily workflow

```bash
pnpm dev                         # start dev server (hot-reloads web app changes)

# After editing packages/core source:
pnpm --filter @threat-modeller/core build   # must rebuild — Next.js reads from dist/

# Type-check both packages at once:
pnpm type-check
```

> **Important:** The Next.js dev server picks up changes to `packages/core/dist/` automatically (it watches the filesystem), but you must run `build` first to compile TypeScript changes. Hot module replacement only works for `apps/web/src/`.

---

## Testing the API directly

```bash
# With Anthropic (uses .env.local key)
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "description": "A multi-tenant SaaS application. Each tenant has isolated PostgreSQL schemas on a shared database cluster. A Node.js API handles authentication with JWTs. Users upload documents which are processed by a Python Lambda function and stored in S3. An admin panel is served from the same domain. The API communicates with a third-party payment processor."
    }
  }' | python3 -m json.tool

# With Ollama (no API key needed, Ollama must be running)
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","input":{"description":"..."}}' | python3 -m json.tool

# With BYOK (user-supplied key, bypasses rate limit)
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-ant-...","input":{"description":"..."}}' | python3 -m json.tool

# Test rate limiting — run 4 times quickly, 4th should return 429
for i in 1 2 3 4; do
  curl -s -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"input":{"description":"A Node.js API with PostgreSQL and S3 file uploads behind Nginx on EC2 with JWT auth."}}' \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(i, d.get('success'), d.get('error',{}).get('code',''))"
done
```

---

## Running Ollama locally (without Docker)

```bash
# Install Ollama: https://ollama.com/download
ollama serve                     # starts Ollama API at localhost:11434
ollama pull llama3.1             # download a model (~4 GB)
ollama pull qwen2.5:32b          # better quality, needs ~20 GB VRAM

# Verify it's running
curl http://localhost:11434/api/tags

# The dev server will use it automatically when provider=ollama is selected
```

---

## Smoke testing the core pipeline directly

```bash
cd packages/core

# Simple provider test (just verifies API key works)
ANTHROPIC_API_KEY=sk-ant-... npx tsx src/test-manual.ts

# Full 2-pass pipeline test
ANTHROPIC_API_KEY=sk-ant-... npx tsx src/test-manual.ts --full-pipeline

# With Ollama (no key needed, Ollama must be running)
OLLAMA_BASE_URL=http://localhost:11434/v1 \
OLLAMA_MODEL=llama3.1 \
npx tsx src/test-manual.ts --full-pipeline

cd ../..
```

---

## Known issues and how they were debugged

### 1. `next.config.ts` not supported
**Symptom:** `Error: Configuring Next.js via 'next.config.ts' is not supported.`
**Cause:** Next.js 14 requires `.js` or `.mjs`. TypeScript config support was added in Next.js 15.
**Fix:** Renamed to `next.config.mjs`, removed TypeScript type annotation, used JSDoc `@type` comment instead.

### 2. Pass 2 JSON truncated mid-response
**Symptom:** `LLMParseError: JSON parse failed: Expected ',' or ']' after array element in JSON at position 6518`
**Cause:** `maxTokens: 2048` for Pass 2 was too small. Five detailed threats with long mitigations generate ~5,000+ tokens.
**Fix:** Increased to `maxTokens: 4096` in `llm-pipeline.ts`.

### 3. Title length Zod validation failing
**Symptom:** `Pass 1 schema validation failed: threats[4].title: String must contain at most 80 character(s)`
**Cause:** The 80-char title limit was too strict. LLMs generate descriptive titles like "Cross-Tenant PostgreSQL Schema Traversal via Tenant ID Manipulation in Node.js API" (81 chars).
**Fix:** Increased to 120 chars in both `pass1-output.schema.ts` and `pass2-output.schema.ts`.

### 4. Timeout errors shown as PROVIDER_ERROR (502)
**Symptom:** Requests time out after 55s but return 502 instead of 504.
**Cause:** Node.js 17+ `AbortSignal.timeout()` fires a `DOMException` with `name === "TimeoutError"`, not `"AbortError"`. The provider only checked for `"AbortError"`.
**Fix:** Both providers now check `err.name === "AbortError" || err.name === "TimeoutError"`.

### 5. Unhandled Zod errors in pipeline
**Symptom:** Server returns 500 with "An unexpected error occurred." when LLM output fails schema validation.
**Cause:** `ZodError` was not caught by the route's `LLMProviderError` or `LLMParseError` checks.
**Fix:** Pipeline now uses `.safeParse()` and throws `LLMParseError` on schema failure. Route logs `err.message` server-side so the schema violation is visible in logs.

### 6. Duplicate export of ThreatAnalysisPipeline
**Symptom:** `error TS2308: Module "./types.js" has already exported a member named 'ThreatAnalysisPipeline'`
**Cause:** `ThreatAnalysisPipeline` is defined in `types.ts` AND re-exported from `pipeline/pipeline.interface.ts`. `index.ts` exported both.
**Fix:** Removed the `export * from "./pipeline/pipeline.interface.js"` line from `index.ts`.

### 7. Docker: @threat-modeller/core symlink broken in runner
**Symptom:** Would have caused `Cannot find module '@threat-modeller/core'` in the Docker runner stage.
**Cause:** pnpm creates `apps/web/node_modules/@threat-modeller/core` as a relative symlink (`../../../../packages/core`). Selective COPY of `node_modules` without the full pnpm virtual store breaks the resolution chain.
**Fix:** Enabled `output: "standalone"` in `next.config.mjs` with `outputFileTracingRoot` set to the monorepo root. Next.js traces the actual files and copies them into `.next/standalone/packages/core/dist/` — no symlinks involved.

### 8. Pass 2 too slow (65–77 seconds)
**Symptom:** Analysis exceeds 60s on Vercel Hobby plan.
**Cause:** Default model was `claude-opus-4-6` which is slow. Even after switching to `claude-sonnet-4-6`, pass 2 with verbose mitigations generated ~5,000 tokens.
**Fix:** Changed default model to `claude-sonnet-4-6`. Tightened pass2 prompt to require single-sentence, ≤30-word mitigations. Pass 2 now generates ~2,500–3,500 tokens.

---

## Adding a new LLM provider

1. Create `packages/core/src/providers/<name>.provider.ts` implementing `LLMProvider`.
2. Add `"<name>"` to the union in `types.ts` (`LLMProvider.name`, `ThreatReport.metadata.provider`, `AnalyzeRequest.provider`).
3. Add a branch in `packages/core/src/providers/index.ts` `createProvider()`.
4. Update `apps/web/src/app/api/analyze/route.ts` Zod schema to include the new provider name.
5. Update `apps/web/src/components/ApiKeyInput.tsx` to show the option.
6. Update `apps/web/src/hooks/useAnalyze.ts` and `apps/web/src/app/page.tsx` type annotations.
7. Run `pnpm --filter @threat-modeller/core build && pnpm --filter @threat-modeller/web type-check`.

See `ollama.provider.ts` as the reference implementation for a non-key provider.

---

## Prompt tuning

The prompts are the most important part of the system. Both live in `packages/core/src/prompts/`.

**Pass 1 (`pass1-stride.ts`) tuning tips:**
- The "7–10 threats, never fewer" rule is critical — without it, models return 3–4 generic threats.
- The explicit STRIDE definitions are necessary — models confuse Repudiation and Information Disclosure without them.
- The "no mitigations in this pass" rule prevents the model from spending tokens on solutions before scoring.

**Pass 2 (`pass2-dread.ts`) tuning tips:**
- The quality filter rules directly combat the LLM's tendency toward generic output. They must be phrased as explicit REJECT rules, not positive instructions.
- The mitigation specificity example ("Add row-level security to the PostgreSQL schemas using per-tenant RLS policies...") is a one-shot example that dramatically improves output quality.
- Keep mitigation length ≤30 words to prevent token budget overruns. Longer instructions produce longer mitigations.
- `temperature: 0.1` for Pass 2 is intentional — scoring must be deterministic and consistent.

**Testing a prompt change:**
```bash
# Rebuild core after changing prompts
pnpm --filter @threat-modeller/core build

# Run smoke test against the full pipeline
cd packages/core
ANTHROPIC_API_KEY=sk-ant-... npx tsx src/test-manual.ts --full-pipeline
```

---

## Deployment checklist

- [ ] `pnpm --filter @threat-modeller/core build` passes
- [ ] `pnpm --filter @threat-modeller/web type-check` passes
- [ ] `pnpm --filter @threat-modeller/web build` completes (standalone output in `.next/standalone/`)
- [ ] `ANTHROPIC_API_KEY` set in deployment environment
- [ ] Vercel Root Directory set to `apps/web` (or `vercel.json` configured)
- [ ] Function timeout: Vercel Pro (300s) recommended; Hobby (60s) is marginal with Sonnet

---

## File change impact map

| You changed... | You must also... |
|---|---|
| `packages/core/src/**` | Run `pnpm --filter @threat-modeller/core build` |
| `packages/core/src/types.ts` | Run type-check on web app too |
| `apps/web/src/app/api/analyze/route.ts` | Dev server hot-reloads automatically |
| `apps/web/src/components/**` | Dev server hot-reloads automatically |
| `apps/web/next.config.mjs` | Restart dev server |
| `apps/web/src/lib/export/pdf.ts` | Dev server hot-reloads; test by clicking PDF export |
| `Dockerfile` | `docker build -t threatlens .` to verify |
| `docker-compose.yml` | `docker compose up --build` to verify |
