---
name: repo-intelligence-mapper
description: "Maps unfamiliar software repositories into useful architecture knowledge: modules, data flow, entry points, dependencies, tests, deployment paths, and risk zones. Use before large changes, onboarding, audits, debugging, or agentic coding in complex repos."
license: MIT
metadata:
  version: '1.0'
  author: usahomes-sold
---

# Repo Intelligence Mapper

## When to Use This Skill

Use this skill when the user wants a fast but rigorous understanding of a codebase before changing it.

Common requests:

- "understand this repo"
- "map the architecture"
- "find where this feature lives"
- "explain the data flow"
- "prepare context for another coding agent"
- "audit the codebase before merging"
- "make me a repo brief"

## Output Modes

Choose the smallest useful mode.

### Quick Map

Use for small repos or urgent debugging.

Include:

- project purpose
- framework and runtime
- main directories
- likely entry points
- test commands
- top risks

### Deep Architecture Map

Use for complex products, monorepos, or major changes.

Include:

- system overview
- runtime boundaries
- request/data flow
- authentication and authorization
- persistence layer
- async jobs and queues
- external integrations
- tests and quality gates
- deployment path
- risk register

### Agent Handoff Brief

Use when another agent will implement changes.

Include:

- target files and symbols
- relevant conventions
- acceptance criteria
- commands to run
- traps to avoid
- suspected blast radius

## Mapping Workflow

### Repository Survey

Inspect:

- dependency manifests
- framework configuration
- environment examples
- database schemas or migrations
- route definitions
- API clients
- background workers
- test folders
- CI configuration
- deployment files

### Build a System Model

Answer:

1. What does the application do?
2. What are the primary runtimes?
3. Where does execution start?
4. How does data enter the system?
5. Where is data validated?
6. Where is data persisted?
7. What external services are involved?
8. Where are permissions enforced?
9. How are errors surfaced?
10. How is correctness tested?

### Identify Code Ownership Zones

Classify directories as:

- **Core domain:** business rules and state transitions.
- **Interface layer:** routes, controllers, UI, CLI, API.
- **Infrastructure:** database, queues, storage, deployment, auth providers.
- **Glue code:** adapters, serialization, client wrappers.
- **Tests:** unit, integration, end-to-end, fixtures.
- **Generated or vendor code:** avoid editing unless necessary.

### Trace One Real Flow

For each major feature, trace:

1. user or system trigger
2. request handler or event consumer
3. validation
4. authorization
5. business operation
6. persistence
7. side effects
8. response or notification
9. test coverage

## Risk Heuristics

Flag:

- duplicated business rules
- authorization checks split across layers
- status machines without transition guards
- tests that mock too much
- migrations without rollback strategy
- external API calls without retries or idempotency
- broad catch blocks that hide failures
- environment variables without documentation
- generated files committed without source

## Deliverable Template

```markdown
# Repository Map: <repo>

## Executive Summary

<One paragraph describing what the repo does and how it is structured.>

## Runtime and Stack

- **Frontend:** ...
- **Backend:** ...
- **Database:** ...
- **Jobs:** ...
- **Deployment:** ...

## Architecture Map

<Directory and module map.>

## Critical Flows

### <Flow Name>

1. Trigger:
2. Handler:
3. Validation:
4. Authorization:
5. Persistence:
6. Side effects:
7. Tests:

## Quality Gates

- Commands:
- CI:
- Test coverage:

## Risk Register

- **Risk:** ...
  - Impact:
  - Evidence:
  - Recommendation:

## Agent Handoff

- Target files:
- Important conventions:
- Do not touch:
- Suggested tests:
```

## Guardrails

Do not pretend certainty when a flow is inferred. Mark uncertain claims as "likely" and name the evidence needed to confirm.
