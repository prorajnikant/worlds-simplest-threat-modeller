# ── base: pnpm + node ──────────────────────────────────────────────────────
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── deps: install all workspace dependencies ───────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/web/package.json      ./apps/web/
RUN pnpm install --frozen-lockfile

# ── builder: compile core, then build Next.js ──────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules                ./node_modules
COPY --from=deps /app/packages/core/node_modules  ./packages/core/node_modules
COPY --from=deps /app/apps/web/node_modules       ./apps/web/node_modules
COPY . .

# Build @threat-modeller/core first (apps/web imports from its dist/)
RUN pnpm --filter @threat-modeller/core build

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @threat-modeller/web build

# ── runner: minimal production image ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone bundle: self-contained server + all traced node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Static assets and public files (not included in standalone)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static  ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public        ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js is emitted at the standalone root by Next.js
# Pass secrets at runtime: docker run -e ANTHROPIC_API_KEY=sk-ant-...
CMD ["node", "apps/web/server.js"]
