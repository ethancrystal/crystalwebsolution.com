#!/usr/bin/env bash
set -u

ROOT="${1:-$(pwd)}"

section() {
  printf '\n== %s ==\n' "$1"
}

has() {
  command -v "$1" >/dev/null 2>&1
}

section "workspace"
printf 'root: %s\n' "$ROOT"
if [ -d "$ROOT/.git" ] || git -C "$ROOT" rev-parse --show-toplevel >/dev/null 2>&1; then
  git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null | sed 's/^/git-root: /'
  git -C "$ROOT" branch --show-current 2>/dev/null | sed 's/^/branch: /'
  git -C "$ROOT" status --short 2>/dev/null | sed -n '1,40p'
else
  printf 'git: not available for root\n'
fi

section "runtime"
date -Is 2>/dev/null || date
if has node; then
  node --version | sed 's/^/node: /'
else
  printf 'node: not found on PATH\n'
fi
if has pnpm && pnpm_version="$(pnpm --version 2>/dev/null)"; then
  printf 'pnpm: %s\n' "$pnpm_version"
else
  printf 'pnpm: unavailable or missing node runtime\n'
fi
if has docker; then docker --version | sed 's/^/docker: /'; fi

section "load-memory-disk"
if has getconf; then getconf _NPROCESSORS_ONLN | sed 's/^/cpu-count: /'; fi
if has uptime; then uptime; fi
if has free; then free -h; fi
df -h "$ROOT" 2>/dev/null || true

section "common-listeners"
if has ss; then
  ss -ltnp 2>/dev/null | awk 'NR == 1 || $4 ~ /:(3000|5173|8080|5432|5433|6543)$/'
elif has lsof; then
  lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR == 1 || /:(3000|5173|8080|5432|5433|6543) /'
else
  printf 'listener scan unavailable: ss/lsof not found\n'
fi

section "busy-dev-processes"
if has pgrep; then
  pgrep -af 'node|pnpm|vite|vitest|playwright|tsx|ts-node|docker|railway' | sed -n '1,40p' || true
else
  ps -eo pid,comm,args | awk '/node|pnpm|vite|vitest|playwright|tsx|ts-node|docker|railway/ && !/awk/' | sed -n '1,40p'
fi

section "docker-containers"
if has docker; then
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | sed -n '1,40p' || true
else
  printf 'docker: not installed\n'
fi
