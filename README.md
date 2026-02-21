# ThreatLens — World's Simplest Threat Modeller

Paste a plain-text architecture description. Get up to five ranked, specific security threats in under 60 seconds. No account, no diagrams, no setup.

**Live demo:** deploy to Vercel in one click (see [Deployment](#deployment)).

---

## What it produces

Given an architecture description, ThreatLens runs a two-pass LLM pipeline:

1. **Pass 1 — STRIDE identification:** generates 7–10 specific threats, each naming a real component from your description.
2. **Pass 2 — DREAD scoring + quality filter:** scores every threat across five dimensions (Damage, Reproducibility, Exploitability, Affected Users, Discoverability), rejects generic threats, and returns the top 5 sorted by risk.

Every threat includes:
- STRIDE category and affected component
- Concrete attack scenario (attacker, action, technical outcome)
- Business impact (names specific regulations: GDPR, HIPAA, PCI-DSS, SOC2)
- 1–3 specific mitigations (names libraries, config patterns, not "improve security")
- Full DREAD breakdown with arithmetic mean total

---

## Providers

| Provider | Default model | Key required |
|---|---|---|
| Anthropic (default) | `claude-sonnet-4-6` | Yes — from [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| OpenAI | `gpt-4o` | Yes |
| Ollama (local) | `llama3.1` | No — runs on your machine |

> **Quality note:** Anthropic Sonnet produces the best output. Local Ollama models (llama3.1, mistral) follow the prompt structure but tend toward generic advice. `qwen2.5:32b` or `deepseek-r1:32b` are better choices if you have the VRAM.

---

## Quick start

### Prerequisites
- Node.js 20+
- pnpm 9 (`npm install -g pnpm@9`)

### Local development

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Set your API key
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local — set ANTHROPIC_API_KEY=sk-ant-...

# 3. Start the dev server
pnpm dev
# → http://localhost:3000
```

### Docker (production build)

```bash
docker build -t threatlens .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... threatlens
# → http://localhost:3000
```

### Docker Compose with Ollama (fully local, no cloud key needed)

```bash
# Start app + Ollama
docker compose up --build

# Pull a model (in a separate terminal)
docker compose exec ollama ollama pull llama3.1

# Open http://localhost:3000
# Select "Ollama (local)" in the API Key section — no key required
```

For NVIDIA GPU passthrough, uncomment the `deploy` block in `docker-compose.yml`.

---

## Deployment

### Vercel (recommended)

1. Push this repo to GitHub.
2. Import the repo in [vercel.com/new](https://vercel.com/new).
3. Set **Root Directory** to `apps/web`.
4. Add environment variable: `ANTHROPIC_API_KEY = sk-ant-...`
5. Deploy.

> **Vercel Hobby plan caveat:** the free tier has a 60-second function timeout. Analysis with `claude-sonnet-4-6` typically takes 35–65 seconds. Upgrade to Vercel Pro (300s limit) for reliable production use, or set `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` for faster (lower quality) responses on the free tier.

A `vercel.json` at the repo root is not required — setting Root Directory in the dashboard is sufficient.

---

## Environment variables

All variables go in `apps/web/.env.local` for local dev, or in the Vercel dashboard for production.

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for Anthropic provider |
| `OPENAI_API_KEY` | — | Required for OpenAI provider |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Anthropic model ID |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model ID |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama API base URL |
| `OLLAMA_MODEL` | `llama3.1` | Ollama model name (must be pulled first) |
| `RATE_LIMIT_FREE_TIER` | `3` | Free analyses per IP per 24 hours |
| `DISABLE_RATE_LIMIT` | `false` | Set `true` to disable rate limiting in dev |

---

## Repository structure

```
worlds-simplest-threat-modeller/
├── packages/
│   └── core/                        ← @threat-modeller/core (TypeScript library)
│       └── src/
│           ├── types.ts             ← All TypeScript interfaces
│           ├── pipeline/            ← LLMThreatPipeline (2-pass orchestration)
│           ├── providers/           ← Anthropic, OpenAI, Ollama clients
│           ├── prompts/             ← STRIDE (pass1) and DREAD (pass2) prompts
│           ├── schemas/             ← Zod validation schemas for LLM output
│           └── utils/               ← retry, parseLLMJson
├── apps/
│   └── web/                         ← @threat-modeller/web (Next.js 14)
│       └── src/
│           ├── app/
│           │   ├── page.tsx         ← Single-page UI, owns all state
│           │   └── api/analyze/     ← POST /api/analyze
│           ├── components/          ← All React components
│           ├── hooks/               ← useAnalyze, useExport
│           └── lib/                 ← rate-limiter, pdf export, markdown export
├── Dockerfile                       ← Multi-stage production build
├── docker-compose.yml               ← App + Ollama for local-only usage
├── .env.example                     ← Documents all env vars
└── docs/
    ├── architecture.md              ← Technical deep-dive
    └── development.md               ← Development guide and known gotchas
```

---

## Rate limiting

The free tier allows 3 analyses per IP per 24 hours (configurable via `RATE_LIMIT_FREE_TIER`). The limiter is in-memory — it resets on server restart and is not shared across multiple instances. For production at scale, replace the `Map` in `apps/web/src/lib/rate-limiter.ts` with Upstash Redis.

Users can bypass the rate limit entirely by providing their own API key (BYOK) in the UI.

---

## Export

After a successful analysis, two export formats are available:

- **PDF** — generated client-side with jsPDF + jspdf-autotable. Includes a summary table and a full detail page per threat.
- **Markdown** — a `.md` file with a summary table and detailed sections. Renders correctly in GitHub, Notion, Obsidian, etc.
