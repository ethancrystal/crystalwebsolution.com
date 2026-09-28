# Output Specification

Produce two Markdown documents. Keep factual claims tied to a source, command, file path, or test result. Use tables for inventories and acceptance gates, paragraphs for interpretation, Mermaid only when it clarifies a real cross-layer flow, and a References section for repository URLs.

## `project-flow-current.md`

Required sections:

1. Executive Summary
2. Source-of-Truth Note
3. System Boundaries
4. User and Route Flow
5. Frontend Architecture
6. Backend and Data Architecture
7. API and Operational Routes
8. Security Model
9. Verification Surface
10. Current Strengths
11. Current Risks and Gaps
12. Recommended Next Flow
13. References

Include the repository, branch, commit, generation date, maturity assessment, key runtime technologies, public/authenticated route surfaces, data flow, security boundaries, and limitations of the analysis.

## `roadmap.md`

Required sections:

1. Roadmap Position
2. Strategic Outcomes
3. Priority Sequence
4. Cross-Cutting Delivery Rules
5. Release Gates
6. Roadmap Risks
7. Suggested Next Three Deliverables
8. References

Each phase must include purpose, dependencies or sequencing rationale, concrete deliverables, and an exit condition. Use P0 for release/security blockers, P1 for high-value hardening or workflow work, and P2 for optimization or deferred expansion.

## Evidence language

Separate these claims:

| Claim | Meaning |
|---|---|
| Implemented | Current source contains the capability |
| Verified | Current source plus a successful relevant test/runtime check |
| Partially verified | Source exists, but an important runtime boundary remains untested |
| Planned | Desired behavior appears in planning documents but not in current implementation |
| Historical | Applies to an earlier commit or environment |
| Not checked | Evidence was unavailable |
