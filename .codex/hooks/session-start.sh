#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote sessions)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The remote container ships Chromium at /opt/pw-browsers/chromium; skip
# puppeteer's own Chrome download and point it at the preinstalled binary.
export PUPPETEER_SKIP_DOWNLOAD=true
if [ -x /opt/pw-browsers/chromium ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PUPPETEER_SKIP_DOWNLOAD=true' >> "$CLAUDE_ENV_FILE"
  echo 'export PUPPETEER_EXECUTABLE_PATH="/opt/pw-browsers/chromium"' >> "$CLAUDE_ENV_FILE"
fi

npm install
