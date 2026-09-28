---
name: multi-agent-code-review
description: "Runs rigorous multi-agent code review by comparing independent reviewers, synthesizing agreements and disagreements, and producing high-signal findings. Use for PR reviews, merge readiness, security-sensitive changes, refactors, and architecture checks."
license: MIT
metadata:
  version: '1.0'
  author: usahomes-sold
---

# Multi-Agent Code Review

## When to Use This Skill

Use when a pull request, patch, or diff needs review beyond a single-pass scan.

Good fits:

- PR review before merge
- security-sensitive changes
- auth/RBAC changes
- migrations
- payment or billing code
- AI pipeline changes
- refactors with broad blast radius
- flaky test fixes
- generated-code workflows

## Review Philosophy

A strong review asks: "What could break, who is affected, and how do we know?"

Prioritize:

1. correctness
2. security
3. data integrity
4. authorization
5. backwards compatibility
6. observability
7. maintainability
8. style

Do not waste review space on trivial style issues unless they hide real risk.

## Multi-Agent Protocol

### Independent Reviews

If multiple agents are available, assign distinct lenses:

- **Reviewer A: Correctness and tests**
  - logic bugs
  - edge cases
  - test adequacy
  - regressions

- **Reviewer B: Security and architecture**
  - authorization
  - data exposure
  - invariants
  - system boundaries

- **Reviewer C: Operations and maintainability**
  - migrations
  - deployments
  - observability
  - performance
  - maintainability

Each reviewer should inspect the diff independently before reading other reviewers' conclusions.

### Finding Format

Every finding must include:

- severity: blocking, high, medium, low, nit
- location: file and line when possible
- issue: concise title
- evidence: why this is a problem
- impact: what can go wrong
- suggested fix: concrete action
- confidence: high, medium, or low

### Synthesis

After independent reviews:

1. Group duplicate findings.
2. Promote findings that multiple reviewers independently caught.
3. Resolve disagreements by checking the diff and tests.
4. Separate confirmed issues from hypotheses.
5. Make a merge recommendation.

## Review Checklist

### Correctness

- Are all new states reachable only through valid transitions?
- Are edge cases handled?
- Are null, empty, missing, and malformed inputs handled?
- Are errors propagated usefully?
- Are transactions or atomic operations needed?

### Security

- Are authn and authz enforced server-side?
- Can a user access another user's data?
- Are privileged paths protected at every entry point?
- Are secrets exposed in logs or responses?
- Are uploads, HTML, markdown, or URLs sanitized?

### Data Integrity

- Are schema changes compatible with existing data?
- Are migrations reversible or safely forward-only?
- Are unique constraints, foreign keys, and indexes aligned with logic?
- Are race conditions possible?

### API Compatibility

- Does the change break clients?
- Are response shapes stable?
- Are validation errors compatible?
- Are feature flags or rollout controls needed?

### Tests

- Are tests added for the changed behavior?
- Do tests prove authorization and negative paths?
- Are fixtures realistic?
- Are snapshots hiding real behavior changes?

### Operations

- Are logs and metrics sufficient?
- Are new env vars documented?
- Can deployment start cleanly?
- Are external calls retried or made idempotent where needed?

## Output Template

```markdown
# Multi-Agent Review

## Summary

- **Reviewer A:** ...
- **Reviewer B:** ...
- **Reviewer C:** ...

## Agreements

- **<Finding title>:** ...

## Disagreements

- **<Topic>:** Reviewer A says ..., Reviewer B says ... My assessment: ...

## Findings

### Blocking

- **<file:line> — <title>**
  - Evidence:
  - Impact:
  - Suggested fix:
  - Confidence:

### Non-blocking

- **<file:line> — <title>**
  - Evidence:
  - Suggested fix:

## Final Recommendation

Approve, request changes, or needs discussion.
```

## Guardrails

Do not approve security-sensitive changes if authorization paths were not inspected. Do not request changes for speculative issues without evidence. Mark uncertain items as questions.
