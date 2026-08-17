---
name: sync-project-context
description: Use when task context, plans, decisions, progress, verification evidence, or handoff notes must be synchronized to Linear, Notion, or both for continuity across computers, networks, or locations.
---

# Sync Project Context

Synchronize durable task context to the user’s chosen project-management destinations without treating either service as the sole source of truth. Keep repository/project files authoritative for implementation details; use Linear for actionable work and status, Notion for durable narrative context and navigation, or both when requested.

## When to use

Use this skill when the user asks to carry work between computers, networks, or locations; log SEO, product, engineering, or project-management work externally; synchronize plans, decisions, progress, verification, or handoff notes; create or update a Linear issue/project/document and/or a Notion page/database entry; or make future sessions easy to resume.

Do not sync secrets, access tokens, private credentials, raw customer data, or speculative claims. Ask before publishing sensitive material or changing an existing external record whose ownership is ambiguous.

## Destination selection

Interpret the request explicitly:

| Request | Destination |
|---|---|
| “Linear” | Linear only |
| “Notion” | Notion only |
| “both”, “Linear and Notion”, or “all work logged” | Linear and Notion |
| No destination specified | Ask once; default to repository-only until answered |

Before any external write, inspect connector availability and current workspace/project context. If a named connector is disabled or unavailable, report that fact and preserve an import-ready local log; never claim synchronization succeeded. Do not create duplicate connectors.

## Canonical local record

Maintain a concise Markdown record in the repository or shared project files when the task has multiple milestones. Use `templates/context-sync-log.md`. Include the task name and repository, current status and next action, decisions and rejected alternatives, files/commits/branches/deployments and verification evidence, external record IDs/URLs after successful writes, blockers/assumptions/safe resumption instructions, and the last synchronized timestamp.

The local record is the fallback and audit trail. Never overwrite unrelated project documentation merely to create a sync log.

## Linear workflow

Use Linear for work that should be actionable or assigned. Prefer an existing project or issue discovered by search. Create a project only when the user asks for a new project structure or no suitable container exists. Use an issue for a discrete implementation, bug, or follow-up; a project document for a durable plan/specification; a project status update for milestone progress; and a comment for incremental evidence attached to an existing issue/project.

Before creating anything, search by repository, project name, task title, or a stable sync key. Use a stable key such as `SYNC:<repository>:<topic>:<slug>` in the description or document metadata. If a matching record exists, update it rather than creating a duplicate. Keep titles short and put detailed Markdown in the description/document body.

Record the Linear identifier, URL, team, project, issue, document, or status-update ID in the local log after each successful write.

## Notion workflow

Use Notion for durable narrative context, decision history, research notes, SEO logs, and cross-session navigation. Prefer an existing project hub or database found by search. Create a dedicated hub only when none exists and the user has requested persistent synchronization.

Use one parent page per repository/project and child pages or database entries for major workstreams. Recommended sections are `Current State`, `Decisions`, `Implementation Log`, `Verification`, `External Links`, and `Resume Here`. For database-backed logs, use one entry per meaningful milestone rather than one entry per tool call.

Search for the stable sync key before creating a page or entry. Update the matching page/entry when the milestone changes. Preserve prior decisions and append corrections instead of silently rewriting history. Follow the Notion connector’s enhanced Markdown rules; do not use standard pipe tables if the connector requires Notion table syntax.

Record the Notion page/database identifier and URL in the local log after each successful write.

## Dual-write procedure

When both destinations are requested, perform the following sequence:

1. Update the local Markdown record first.
2. Resolve existing Linear and Notion targets by stable key and project context.
3. Write the actionable summary to Linear.
4. Write the durable narrative/context record to Notion.
5. Add the resulting IDs/URLs back to the local record.
6. Re-read or query both records when the connector supports it.
7. Report exactly which writes succeeded, failed, or were skipped.

If one destination fails, continue only if the other write is safe and independent. Mark the failed destination as pending in the local log; do not present a partial sync as complete.

## Content policy

Sync facts, decisions, links, file paths, commit hashes, test results, deployment identifiers, blockers, and next steps. Distinguish `verified`, `inferred`, `planned`, and `blocked`. Do not copy whole conversations by default; summarize them into durable decisions and action items. Do not include credentials, environment values, private customer information, or sensitive browser/session details.

For SEO work, log every material SEO effort, including strategy, keyword/content decisions, metadata contracts, canonical rules, structured-data changes, sitemap/robots changes, internal-linking decisions, tests, deployment checks, and post-deployment findings. Use one milestone entry per coherent effort and link the repository commit or plan file.

## Safe handoff format

End every synchronization with:

> **Resume here:** [one sentence describing the next safe action, the current branch/commit, and any blocker].

Then include:

| Destination | Result | Record |
|---|---|---|
| Repository | updated / pending | path + commit |
| Linear | updated / created / skipped / failed | identifier + URL |
| Notion | updated / created / skipped / failed | page/database identifier + URL |

Never claim “synced” unless the external write returned success and the record was identified.

## Failure handling

If a connector is disabled, inspect configuration and tell the user how to enable it. If it is enabled but its server/tools are unavailable, preserve the local record and report the exact limitation. If authentication, workspace, team, project, or database selection is ambiguous, ask a focused question instead of guessing. Do not retry a failed destructive or duplicate-prone write blindly.
