# Vendored Video Sources

This local skill vendors upstream plugin material so it remains usable as a single self-contained skill.

| Source | Vendored path | Version |
|---|---|---|
| Remotion best practices | `references/vendors/remotion/` | 1.0.2 |
| HyperFrames authoring | `references/vendors/hyperframes/authoring/` | 0.1.2 |
| HyperFrames CLI | `references/vendors/hyperframes/cli/` | 0.1.2 |
| HyperFrames registry | `references/vendors/hyperframes/registry/` | 0.1.2 |
| HeyGen video | `references/vendors/heygen/video/` | plugin 2.2.3, skill 3.1.0 |
| HeyGen avatar | `references/vendors/heygen/avatar/` | plugin 2.2.3, skill 3.1.0 |

Executable HyperFrames utilities are also available at:

- `scripts/hyperframes-animation-map.mjs`
- `scripts/hyperframes-contrast-report.mjs`

The upstream folders include their own `SKILL.md`, detailed rules, references, examples, scripts, and agent metadata. Plugin branding images and icons are intentionally not copied.

## Update Rule

Treat this file as the provenance record. When refreshing a vendor:

1. Compare upstream and vendored versions.
2. Replace the matching vendor subtree without changing locally-authored references.
3. Re-copy executable HyperFrames scripts.
4. Review the main router for changed commands or non-negotiable rules.
5. Re-run skill validation and representative workflow tests.
