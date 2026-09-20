---
name: failure-debugger
description: "Systematic debugging skill for tough failures: failing tests, production errors, broken builds, flaky behavior, regressions, API failures, and deployment crashes. Use when the user asks to diagnose, reproduce, isolate, fix, and verify a failure."
license: MIT
metadata:
  version: '1.0'
  author: usahomes-sold
---

# Failure Debugger

## When to Use This Skill

Use this skill for hard debugging tasks where the agent must move from symptom to root cause to verified fix.

Trigger phrases:

- "debug this"
- "tests are failing"
- "deployment crashed"
- "find the root cause"
- "it worked before"
- "flaky test"
- "API returns 500"
- "pipeline is broken"
- "why is this happening?"

## Debugging Doctrine

1. **Reproduce before fixing.** A fix without a reproduced failure is guesswork.
2. **Separate symptom from cause.** Logs show where pain appears, not always where the defect lives.
3. **Change one variable at a time.** Avoid shotgun edits.
4. **Prefer minimal proof.** A small failing test or command is better than a vague stack trace.
5. **Verify the negative and positive path.** Confirm the bug is gone and normal behavior still works.

## Required Workflow

### Failure Intake

Capture:

- exact command, URL, action, or workflow that fails
- expected behavior
- actual behavior
- first known bad version or time
- environment details
- relevant logs or screenshots
- recent changes

If any are missing, infer from available evidence but state uncertainty.

### Reproduction

Try to reproduce with:

1. the exact reported command or action
2. the smallest targeted test
3. a direct function/API call
4. a local mock only if the real dependency is unavailable

Record the reproduction artifact:

- command
- input
- output
- stack trace
- failing assertion

### Triage

Classify the failure:

- syntax or compile error
- type mismatch
- dependency or version conflict
- configuration/env error
- data shape mismatch
- authorization or permission error
- race condition
- timeout or resource issue
- regression from recent change
- external service failure
- test fixture problem

### Root Cause Isolation

Use narrowing tactics:

- inspect stack trace frames from app code first
- compare expected vs actual data at boundary points
- bisect recent changes when available
- add temporary logging only when necessary
- inspect mocks and fixtures for stale assumptions
- verify environment variables and configuration
- check async behavior and transaction boundaries

### Fix Strategy

Choose the least risky fix:

- correct logic at the true source of bad state
- add validation at boundaries
- normalize data shapes
- update tests when behavior intentionally changed
- add retry/idempotency for external calls
- improve error messages where they reduce future debugging cost

Do not hide the failure by:

- swallowing errors
- loosening assertions without justification
- increasing timeouts blindly
- disabling tests
- removing type checks

### Verification

Run:

1. the original failing command
2. a targeted regression test
3. nearby tests
4. broader quality gate if feasible

If the issue was production/deployment-related, verify:

- port binding
- environment variables
- health endpoint
- migration state
- build artifacts
- startup logs

## Debug Report Template

```markdown
# Debug Report

## Symptom

<What failed and how it was observed.>

## Reproduction

- Command/action:
- Result:

## Root Cause

<Specific cause, file/function if applicable, and why it failed.>

## Fix

<What changed and why.>

## Verification

- `<command>`: passed/failed
- `<command>`: passed/failed

## Remaining Risks

<Anything not fully verified.>
```

## Flaky Failure Protocol

For flaky tests or intermittent bugs:

1. Run the test multiple times.
2. Check for shared state, time, randomness, network, ordering, and async waits.
3. Make the test deterministic.
4. Avoid arbitrary sleeps unless no event signal exists.
5. Add diagnostics that help future failures explain themselves.
