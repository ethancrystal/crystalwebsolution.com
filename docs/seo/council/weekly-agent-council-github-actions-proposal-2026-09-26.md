# Weekly Agent Council in GitHub Actions — Proposal

**Prepared:** 2026-09-26  
**Status:** Proposal only; no workflow or repository automation changed  
**Repository:** `CD Sportswear USA/site`

## Recommendation

Use GitHub Actions first as a **read-only, advisory weekly review**. Keep routine Search Console collection and SEO scorecard generation as a separate first step. Run the full Council only when a fresh, dated decision brief exists and the decision warrants independent review. Store the Council JSON and run output as workflow artifacts; do not commit generated results, publish content, update the keyword registry, create a PR, or merge automatically.

The workflow must not use the user's desktop Claude login or the authenticated Manus GSC MCP session as though they were present on a GitHub-hosted runner. CI requires its own noninteractive credentials and least-privilege data access.

## Options

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|
| **A. Full Council every Monday** | Simple cadence, but can repeatedly review stale documents and may re-open decisions already recorded in `goals.md`. The full Council does not collect fresh GSC/SERP evidence by itself. | High relative to lightweight checks: Agent Council documents about nine underlying model invocations for a full run. Exact cost depends on model, tokens, and Claude authentication. | Medium, but only useful after fresh evidence generation and CI authentication work. |
| **B. Weekly evidence packet; Council on a meaningful new/changed decision brief (recommended)** | Routine data collection remains cheap and reviewable. Full Council is reserved for decision artifacts; prevents the last review's process-for-process's-sake problem. | Lower ongoing model usage; Council cost only when triggered. | Medium-high: add a read-only GSC report step and a freshness gate, then the Council CLI step. |
| **C. Manual-only Council via `workflow_dispatch`** | Lowest effort and avoids unattended credentials while validating that CI works. It will not provide a weekly automatic review. | Only when manually run. | Low-medium. Good first rollout. |

## What the last review changes about the automation

The existing `docs/seo/goals.md` already identifies the RFP worksheet as the current move. The last Council review found that the A/B/C framing could reopen a settled choice, and that an indexed page with zero exact-pair impressions should trigger diagnosis before anyone treats more content as a ranking remedy. Therefore, the weekly workflow should **not** ask the Council to pick a fresh content topic from the same old brief each week.

Instead, the weekly evidence step should produce a dated packet that:

- Re-pulls the latest complete GSC window with exact `rfp web development` AND the exact RFP guide URL filters together; records the property, web search type, data state, date range, clicks, impressions, CTR, and position only when measurable.
- Separates exact-pair data from query-only, page-only, and property-wide context.
- Checks the current run log, repository state, live URL/index state, keyword registry, and open PRs/drafts for overlap.
- Records SERP/intent observations as a dated sample, not as measured volume or proof of causal lift.
- Marks each check pass, fail, or unavailable. An unavailable item stays an explicit gate.

Only if the packet contains a **new material decision** should the Council run. Routine weekly monitoring belongs in a concise run note; it does not need ~9 LLM calls.

## Current readiness and blocking dependencies

The local site repository has `council.yaml`, its Council prompts, and the Python `agent_council` CLI. `council.yaml` is configured for the `claude_cli` runtime and `claude-opus-4-7`; its log path is `./council_log.jsonl`. The project already has `docker-ci.yml` and `seo-publish-blog.yml` workflows. This proposal does not edit or merge either workflow.

Before enabling an unattended weekly Council job:

1. Choose a CI-compatible Claude authentication method. A local `claude auth login` does not transfer to GitHub Actions. For direct CLI use, provision a dedicated least-privilege `ANTHROPIC_API_KEY` secret (or validate another supported headless CLI credential in a manual test); do not copy local credential files into CI. Anthropic's Claude Action also documents a subscription token and workload identity options, but confirm compatibility before using those with Agent Council's direct `claude_cli` subprocess adapter.
2. Provide **read-only GSC data to CI**. The authenticated GSC MCP session on Manus and the user's desktop connector are not automatically available to a GitHub runner. A suitable design is a dedicated Google service identity granted read-only access to the property, with the `webmasters.readonly` scope and a secret/identity method approved by the owner. Alternatively, securely broker a read-only report into CI. Never place a refresh token, service-account key, or MCP bearer token in the repository.
3. Implement and test a small GSC evidence-packet builder (or connect the existing approved reporting job) that emits a dated Markdown/JSON artifact. It must apply the exact combined query+page filter; until then the workflow cannot honestly conduct the evidence-first weekly decision cycle.
4. Pin the Agent Council source to a reviewed immutable commit and pin GitHub Actions to verified full-length commit SHAs before merging the workflow. The repo is currently 14 commits behind its tracked remote and contains uncommitted SEO docs; reconcile the branch carefully before adding CI changes.
5. Test from `workflow_dispatch` first. Confirm credential redaction, one complete GSC query, Council JSON output, expected exit code, uploaded artifact, and no writes to tracked site content.

## Illustrative workflow skeleton

This is a design skeleton, **not ready to paste into production**: replace each action placeholder with a verified full commit SHA, replace `<PINNED_AGENT_COUNCIL_COMMIT>` with a reviewed 40-character source commit, and implement the GSC packet-builder step before enabling `schedule`.

```yaml
name: Weekly SEO Council

on:
  schedule:
    # Monday 9:15 a.m. Eastern; offset from the top of the hour.
    - cron: '15 9 * * 1'
      timezone: America/New_York
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: weekly-seo-council-${{ github.workflow }}
  cancel-in-progress: false

jobs:
  evidence-and-review:
    # Never run this secret-bearing job on untrusted pull_request code.
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<VERIFIED_40_CHAR_COMMIT_SHA>
        with:
          persist-credentials: false

      - uses: actions/setup-python@<VERIFIED_40_CHAR_COMMIT_SHA>
        with:
          python-version: '3.11'

      - name: Install pinned Agent Council
        env:
          COUNCIL_COMMIT: <PINNED_AGENT_COUNCIL_COMMIT>
        run: |
          set -euo pipefail
          [[ "$COUNCIL_COMMIT" =~ ^[0-9a-f]{40}$ ]]
          python -m pip install --upgrade pip
          python -m pip install \
            "git+https://github.com/Avyayalaya/agent-council.git@${COUNCIL_COMMIT}"

      - name: Validate Council configuration
        run: |
          python -m agent_council validate-config council.yaml

      # TODO: Add the reviewed, read-only GSC packet-builder here.
      # It must output a fresh dated brief and refuse stale or incomplete data.
      - name: Build weekly evidence packet
        env:
          GSC_READONLY_CREDENTIAL: ${{ secrets.GSC_READONLY_CREDENTIAL }}
        run: |
          set -euo pipefail
          python scripts/seo/build_weekly_council_packet.py \
            --output docs/seo/council/current-weekly-evidence.md

      - name: Confirm evidence packet is fresh
        run: |
          test -s docs/seo/council/current-weekly-evidence.md
          python scripts/seo/validate_weekly_council_packet.py \
            docs/seo/council/current-weekly-evidence.md

      # Install Claude Code at a tested/pinned version using Anthropic's
      # supported Linux method before this step; do not rely on local login.
      - name: Run full Council (advisory)
        id: council
        continue-on-error: true
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          python -m agent_council review \
            docs/seo/council/current-weekly-evidence.md \
            --tier=1 --config=council.yaml --json \
            > docs/seo/council/latest-verdict.json

      - name: Record outcome in job summary
        if: always()
        run: |
          echo '## Agent Council result' >> "$GITHUB_STEP_SUMMARY"
          echo 'The Council is advisory in this weekly workflow. Review the uploaded JSON and JSONL audit log.' >> "$GITHUB_STEP_SUMMARY"
          if test -f docs/seo/council/latest-verdict.json; then
            cat docs/seo/council/latest-verdict.json >> "$GITHUB_STEP_SUMMARY"
          fi
          echo "Council step outcome: ${{ steps.council.outcome }}" >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@<VERIFIED_40_CHAR_COMMIT_SHA>
        if: always()
        with:
          name: seo-council-${{ github.run_id }}
          path: |
            docs/seo/council/current-weekly-evidence.md
            docs/seo/council/latest-verdict.json
            council_log.jsonl
          if-no-files-found: warn
          retention-days: 30
```

The example intentionally has no `contents: write` permission and no step that commits files, opens PRs, publishes pages, submits a disavow, or changes tracked keywords. `continue-on-error` is appropriate only for this **advisory scheduled report**; preserve the CLI's status as a visible outcome. If a future PR gate is desired, use a separate `pull_request` workflow on trusted, same-repository branches, run it only on changed reviewable SEO artifacts, and let the Council's exit codes block merge according to the chosen policy. Do not expose Claude or GSC secrets to fork pull requests.

Agent Council's current exit codes are `0=SHIP`, `1=REVISE`, `2=HOLD`, `3=INCOMPLETE`, `4=NOT_FOUND`, and `5=CONFIG_ERROR`. Do not convert `REVISE` or `HOLD` into a passing merge gate. Preserve the JSON output and JSONL audit record for inspection.

## Weekly sequencing

1. Run read-only telemetry and inventory checks; generate a new dated evidence packet.
2. Fail closed on missing/stale data or absent combined filters; publish a status note with the gap, not a fabricated result.
3. If the packet proposes a material written recommendation, invoke the full Council. Otherwise skip the LLM review and upload the scorecard only.
4. Keep any Council `SHIP` separate from owner authorization. A passed artifact may proceed to MJ's review; no external or production action happens automatically.
5. Retain the structured Council result as a short-lived GitHub Actions artifact and append the durable approved run note only through the site's normal reviewed repository workflow.

## Official references

- [GitHub Actions workflow events and schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): schedule timezone support, default-branch behavior, manual dispatch, and load delays.
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use): least-privilege tokens, secret handling, and immutable action pinning.
- [Claude Code in GitHub Actions](https://code.claude.com/docs/en/github-actions): CI credentials, subscription token, and workload-identity options; validate any option against the raw CLI runtime used here.
- [Claude Code setup](https://code.claude.com/docs/en/setup): supported Linux installation and authentication basics.
- [Agent Council package metadata](https://raw.githubusercontent.com/Avyayalaya/agent-council/main/pyproject.toml): Python requirement and CLI entry point.
- [Agent Council CLI source](https://raw.githubusercontent.com/Avyayalaya/agent-council/main/src/agent_council/cli.py): review command and exit-code semantics.
- [Agent Council review command](https://raw.githubusercontent.com/Avyayalaya/agent-council/main/commands/council-review.md): expected configuration and full-review invocation.
