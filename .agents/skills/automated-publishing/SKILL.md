---
name: automated-publishing
description: >-
  Publishes the day's written blog .md files live to talk-to-my-lawyer.com via
  the REST publish API. The Blog Writer task writes the files first; this skill
  publishes them. Trigger when the user says "publish today's posts", "run post
  publishing", "push the blogs live", "publish the TTML blog", "run the publish
  batch", or any variant meaning "take the markdown files already written and
  make them live on the TTML blog now". Handles the catch-up wait if the writer
  isn't finished, runs the publish script, parses OK/FAIL output, applies the
  documented per-error fixes, and reports live URLs. Does NOT write blog content
  — that is the Blog Writer's job.
---

# Automated Publishing (TTML)

Takes today's written `.md` files and publishes them live to
talk-to-my-lawyer.com via the REST API.

## Constants

- **Python:** `C:\Python314\python.exe`
- **Publish script:** `C:\Users\moizjmj\ttml-app-work\scripts\publish-batch.py`
- **Blog dir:** `C:\Users\moizjmj\ttml-app-work\blog\`
- **API key:** `C:\Users\moizjmj\.ttml-publish-key` and `BLOG_PUBLISH_API_KEY` env var
- **API endpoint:** `POST https://talk-to-my-lawyer.com/api/blog/publish` (upserts by slug — re-running is always safe)
- **Live URL pattern:** `https://talk-to-my-lawyer.com/blog/{slug}`

Run shell commands through Desktop Commander `start_process` (shell: `cmd`).
Determine today's date with `bash`/`date` if unsure; files are named
`YYYY-MM-DD-{slug}.md`.

## Step 0 — Catch-Up Check

Count today's files (use `dir /b ... *.md` and count lines — the
`dir | find /c` one-liner can mis-quote, so list and count is more reliable):

```bat
dir /b C:\Users\moizjmj\ttml-app-work\blog\YYYY-MM-DD-*.md
```

- **10 files** → Blog Writer done, proceed immediately.
- **1–9 files** → Writer still running. Wait 10 min (`timeout /t 600 /nobreak`), recheck. If still not 10, publish what exists and note the count.
- **0 files** → Writer hasn't started (missed schedule, PC just woke). Wait 20 min (`timeout /t 1200 /nobreak`), recheck. If still 0, report and stop — Blog Writer may have failed.

## Step 1 — Publish

```bat
C:\Python314\python.exe C:\Users\moizjmj\ttml-app-work\scripts\publish-batch.py --today --dir C:\Users\moizjmj\ttml-app-work\blog
```

Read output — one line per file, `[OK]` (HTTP 201/200) or `[FAIL]`.

### Failure handling

- `HTTP 400 Missing or invalid 'slug'` → file missing `---` frontmatter delimiters; fix and re-run that file alone.
- `HTTP 400 Invalid category` → fix `category:` field, re-run single file: `C:\Python314\python.exe C:\Users\moizjmj\ttml-app-work\scripts\publish-batch.py path\to\file.md`
- `HTTP 401` → API key issue; report to user, do not retry.
- `HTTP 404 with x-railway-fallback` → Railway down; retry once after 10 s.
- Network timeout → retry once (Railway cold start).

Re-run a single file by passing its full path instead of `--today --dir ...`.

## Step 2 — Report

- Date published
- X/10 succeeded
- Live URL for each created post: `https://talk-to-my-lawyer.com/blog/{slug}`
- Any failures with the specific error and the fix applied

## Notes

- This is a publish-only skill: it takes write actions (POSTs to the publish
  endpoint) because that is its explicit job. It never generates content.
- When running unattended (scheduled), execute autonomously and report; don't
  ask clarifying questions.
