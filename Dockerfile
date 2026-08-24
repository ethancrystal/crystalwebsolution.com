# syntax=docker/dockerfile:1

FROM node:26-alpine AS deps
WORKDIR /app
RUN corepack enable
# pnpm-workspace.yaml carries overrides/onlyBuiltDependencies (moved out of
# package.json), and .npmrc carries the matching onlyBuiltDependencies entry
# and enable-pre-post-scripts. Without both, this stage's pnpm sees the
# lockfile's recorded overrides but no config supplying them and fails with
# ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM node:26-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined as literal strings at compile time - into
# both the client bundle AND server bundle - so they must be supplied here
# as build args, not later as `docker run -e`. Once the image is built,
# changing these at runtime has no effect; rebuild instead.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN pnpm run build

# Minimal runtime: only the standalone server output + static assets, no
# dev dependencies, no source — matches next.config.js's output:'standalone'.
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Alpine's busybox wget is already present in the base image, so this needs
# no extra package install. Hits the dependency-free /api/health route added
# alongside this Dockerfile; a non-zero exit marks the container unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# SUPABASE_SERVICE_ROLE_KEY is server-only and never inlined into the build
# (unlike the NEXT_PUBLIC_* vars above) - supply it at `docker run -e` /
# compose runtime so the secret never lands in an image layer.
CMD ["node", "server.js"]
