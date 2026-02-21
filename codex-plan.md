# World's Simplest High-Quality Threat Modeller — Execution Plan

## Clarifying Questions (Architecture + LLM Strategy + Positioning)
Resolved for MVP:
- Core engine: In-house lightweight core (parsing + validation + ranking). No external TM engine integration.
- Architecture model: Lightweight schema (structured components/flows), no formal graph/DSL.
- Persistence: Stateless only.
- Determinism: Deterministic-ish output (fixed settings + deterministic post-processing).
- LLM role: Core engine for threat generation + self-critique + filtering.
- Positioning: “Fast 5, but the right 5.” Quality-first.
- Threat scope: Architecture-only threats.
- Export: Client-side only (no backend export endpoint).
- Schema format: JSON schema for output enforcement.
- Scoring formula: 0.4 * Exploitability + 0.3 * Risk + 0.2 * Business Impact + 0.1 * Confidence.
- Hallucination risk: highest priority risk; mitigation is a core design goal.

Open questions for post-MVP:
- Whether to persist models (optional saved models).
- Whether to introduce a formal architecture graph or DSL.
- Deterministic behavior enhancements beyond fixed prompts/settings.

## Core Product Thesis
Create the world’s simplest threat modeller that produces the **five highest-value, architecture-specific threats** with concrete mitigations and detection guidance, without requiring security expertise or complex modeling workflows.

## Differentiation Strategy
- **Thesis:** “Fast 5, but the right 5.”
- **Why it wins for small teams:**
  - Zero setup, minimal input, immediate results.
  - Strict quality enforcement (no generic findings).
  - Delivers actionable outcomes (mitigation + detection) in minutes.
- **Positioning gap vs competitors:**
  - Traditional tools emphasize completeness, diagrams, and enterprise workflows.
  - Generic LLM prompts lack validation, deduplication, and deterministic quality gates.

## System Architecture Plan (Modular Breakdown)
**Frontend (stateless web):**
- Single-page app.
- Inputs: one-liner or detailed markdown.
- “Refine mode” toggle for structured questions (optional).
- Results table (max 5 threats).
- Client-side export to Markdown and PDF.

**Backend API (stateless Node.js):**
- `POST /analyze` accepts input + options, returns structured threats.
- No export endpoint.

**Core Library (`threat-modeller`):**
- Pure, reusable library with deterministic pipelines.
- Designed for reuse in Web, CLI, Slackbot, GitHub Action.

## Threat-Modeller Library Design (Internal Structure)
- `input-parser`
  - Extract components, data stores, auth, deployment signals.
- `assumption-engine`
  - Applies defaults (data sensitivity, auth, multi-tenancy, deployment).
  - Records assumptions with confidence scores.
- `prompt-orchestrator`
  - Builds JSON-schema constrained prompts.
- `threat-generator`
  - LLM generates candidate threats.
- `quality-gate`
  - Validates schema, confidence threshold, required fields, and specificity.
- `deduper`
  - Removes overlapping threats by component + attack vector + category.
- `ranker`
  - Applies scoring formula; deterministic ordering.
- `output-formatter`
  - Generates table-ready data and markdown export.

## LLM Integration Strategy (Options + Trade-offs)
**Option A (MVP, selected): LLM as core engine**
- LLM generates candidate threats; deterministic validators enforce structure, quality, and ranking.
- Pros: Best quality for minimal rules.
- Cons: Hallucination risk; requires strong filtering.


**Post-MVP deterministic enhancements**
- Fixed prompt templates + fixed scoring + constraint-based selection.
- Optional “strict mode” to reject any low-confidence outputs.

**Schema enforcement**
- JSON schema is the canonical enforcement mechanism.
- JSON selected over YAML due to validation rigor and parsing reliability.

## Data Flow Design (Input → Threats)
1. User input (one-liner or markdown).
2. `input-parser` extracts components, flows, data, auth, deployment hints.
3. `assumption-engine` fills missing context with bounded defaults.
4. `prompt-orchestrator` builds a JSON-schema constrained prompt.
5. LLM generates 8–12 candidate threats.
6. `quality-gate` filters invalid/low-confidence/generic outputs.
7. `deduper` collapses overlapping threats.
8. `ranker` scores and selects top 5.
9. `output-formatter` returns final threats to frontend.
10. Frontend exports Markdown/PDF client-side.

## Threat Ranking & Quality Enforcement Mechanism
**Scoring formula:**
- `Score = 0.4 * Exploitability + 0.3 * Risk + 0.2 * Business Impact + 0.1 * Confidence`

**Quality gates (reject if any apply):**
- Generic or not architecture-specific.
- Missing realistic exploitation path.
- Missing concrete mitigation or detection strategy.
- Low business impact.
- Confidence below Medium.

**Determinism approach:**
- Fixed model settings.
- Strict post-processing.
- Stable ordering by deterministic score + tie-breakers.

## Noise Suppression Strategy
- Filter out platitudes (e.g., “use HTTPS”) unless tied to a specific component/flow.
- Dedup by component, attack vector, and threat category.
- Enforce architecture-specific exploitation scenario.

## Hallucination Mitigation Strategy
**Manual mitigation (process):**
- Curate a seed set of reference architectures with known threat lists.
- Review false positives and update validation heuristics.

**Automated mitigation (system):**
- Enforce JSON schema validation with strict types and required fields.
- Cross-check each threat against extracted components and data flows.
- Reject threats referencing non-existent components or unsupported assumptions.
- Add LLM self-critique pass: “Identify any generic or unsupported threats.”
- Confidence-based gating and minimum thresholds.

## MVP Scope Definition (Strict)
- Inputs: plain text and markdown only.
- Output: max 5 threats, table format only.
- Exports: Markdown + PDF (client-side).
- No login or saved models.
- No compliance mapping or PoCs.
- No code snippets.
- Architecture-only threats.

## Post-MVP Evolution Plan
- Optional saved models with lightweight auth.
- CLI using core library.
- Slackbot and GitHub Action.
- Architecture file ingestion (YAML/JSON/IaC).
- Deterministic “strict mode.”
- Optional alternate threat set for exploration.

## Risks & Failure Modes
- Hallucinations slipping through if validation is insufficient.
- Over-filtering leading to <5 threats.
- Inconsistent results due to model drift.
- Misaligned assumptions causing irrelevant findings.
- Export formatting issues for PDF.

## Execution Roadmap (Phased Build Plan)
1. **Core library scaffolding**
   - Define `SystemModel`, `Assumptions`, `ThreatFinding` types.
   - Implement parsing, assumptions, ranking, dedupe, quality gate.
2. **LLM integration**
   - JSON schema definition.
   - Prompt orchestration + generation + self-critique.
3. **Backend API**
   - `POST /analyze` with validation and deterministic pipeline.
4. **Frontend**
   - Inputs, refine toggle, results table, client-side export.
5. **Deterministic CI testing pipeline**
   - Golden tests for known inputs (fixed model params).
   - Snapshot tests on structured outputs.
   - Regression checks for ranking stability.
6. **Launch readiness**
   - Rate limiting, observability, and error logging.

## CI Testing Workflow (Deterministic)
- Use fixed prompts and fixed model settings.
- Snapshot tests for:
  - Input parsing output.
  - LLM structured output (mock or recorded fixture).
  - Final ranked list.
- Re-run with seeded/recorded outputs to prevent drift.

## Public API/Interface Changes
- `POST /analyze` returns array of `ThreatFinding` with required fields.
- Client-side export consumes `ThreatFinding[]` to generate Markdown/PDF.

## Optional Product Name (Suggestion)
- “RightFive” or “Fivefold” (simple, strong, quality-focused).
