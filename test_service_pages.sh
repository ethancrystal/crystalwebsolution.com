#!/bin/bash
echo "Starting production server on port 3005..."
pnpm start --port 3005 &
SERVER_PID=$!

# Wait for server to be ready
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/ || echo "000")
  if [ "$STATUS_CODE" -eq 200 ]; then
    echo "Server is ready after $ATTEMPT attempts"
    break
  fi
  ATTEMPT=$((ATTEMPT+1))
  sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Server did not become ready in time"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# Now test a few service pages
PAGES=("/services/web-development" "/services/application-development" "/services/brand-design" "/services/logo-design")
for PAGE in "${PAGES[@]}"; do
  echo "Testing $PAGE"
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3005$PAGE" || echo "000")
  if [ "$STATUS_CODE" -ne 200 ]; then
    echo "  FAIL: $PAGE returned $STATUS_CODE"
    continue
  fi
  # Fetch the page and check for some expected content
  CONTENT=$(curl -s "http://localhost:3005$PAGE")
  # Check for the presence of the new sections and placeholder notes
  # We'll look for a few strings that we know we added
  if echo "$CONTENT" | grep -q "scenario"; then
    echo "  PASS: scenario section found"
  else
    echo "  FAIL: scenario section not found"
  fi
  if echo "$CONTENT" | grep -q "deliverablesNote"; then
    echo "  PASS: deliverablesNote section found"
  else
    echo "  FAIL: deliverablesNote section not found"
  fi
  if echo "$CONTENT" | grep -q "\[CONFIRM:"; then
    echo "  PASS: placeholder note found"
  else
    echo "  FAIL: placeholder note not found"
  fi
done

# Kill the server
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo "Done."