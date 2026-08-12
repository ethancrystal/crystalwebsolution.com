---
name: blog-poster
description: Publish TTML (Talk-to-My-Lawyer) blog markdown posts to the live site via the REST API at POST /api/blog/publish on talk-to-my-lawyer.com. Self-contained — the Python publisher script and reference docs are bundled inside the skill. Use this skill whenever the user says "post the blogs", "publish the blog posts", "push to TTML", "send the markdown to the blog", "post via API", "run the blog poster", "publish today's posts", "republish a blog post", "blog poster", or any variant that means "take markdown content I already have and make it live on the TTML blog now". Also trigger when the user pastes a markdown blog post and asks for it to go live. Does NOT generate content — that's the ttml-blog-batch skill's job. This skill only handles publishing.
---

# Blog Poster — TTML REST Publish (self-contained)

Publishes one or more markdown blog posts to **https://talk-to-my-lawyer.com** in seconds via REST. Bundle includes a Python script (`scripts/publish-batch.py`) that does the actual HTTP work — Python stdlib only, no `pip install` needed.

## Quick reference

| | |
|---|---|
| **Endpoint** | `POST https://talk-to-my-lawyer.com/api/blog/publish` (override with `TTML_PUBLISH_ENDPOINT` env var) |
| **Auth** | `Authorization: Bearer <BLOG_PUBLISH_API_KEY>` |
| **Bundled script** | `scripts/publish-batch.py` (next to this SKILL.md) |
| **Reference docs** | `reference/api-spec.md`, `reference/categories.md`, `reference/example-post.md` |
| **Blog dir auto-detect (in order)** | `$TTML_BLOG_DIR` → `./blog` → `../blog` → `<repo-root>/blog` (walks up looking for `.git/`) → `~/ttml-app-work/blog` |
| **API key auto-detect (in order)** | `$BLOG_PUBLISH_API_KEY` → file at `$TTML_PUBLISH_KEY_FILE` → `~/.ttml-publish-key` → `.publish-key` next to script |

---

## Step 1 — Read what the user wants

Map the user's phrasing to a publish mode:

| User said... | Mode | Command |
|---|---|---|
| "publish today's posts", "push today's batch" | Batch / today | `python publish-batch.py --today` |
| "publish the 2026-05-24 posts" | Batch / specific date | `python publish-batch.py --date 2026-05-24` |
| "post this file" + a path | Single file | `python publish-batch.py "<path>"` |
| "post these files" + multiple paths | Multi-file | `python publish-batch.py "<p1>" "<p2>" ...` |
| User pastes markdown content (no file) | Inline → temp file | write to OS temp, then publish that |
| User gives slug + title + content as fields | Inline JSON | `python publish-batch.py --json '{...}'` |

If ambiguous, ask one clarifying question before running.

---

## Step 2 — Locate the script

The script ships with this skill at `scripts/publish-batch.py` (sibling of this SKILL.md). After install it lives at the skill's install root, which is platform-specific. Use whichever path resolves:

- `$CLAUDE_PLUGIN_ROOT/skills/blog-poster/scripts/publish-batch.py` (when set)
- `~/.claude/skills/blog-poster/scripts/publish-batch.py`
- Inside the source repo: `<repo-root>/.claude/skills/blog-poster/scripts/publish-batch.py`
- Inside the source repo: `<repo-root>/scripts/publish-batch.py` (canonical operations copy)

The script is location-agnostic — invoke it from any cwd. Do **not** require the user to `cd` anywhere.

---

## Step 3 — Confirm an API key is reachable

The script handles its own key lookup. DO NOT prompt the user unless all sources are empty. Order:

1. `BLOG_PUBLISH_API_KEY` env var
2. File at path in `TTML_PUBLISH_KEY_FILE` env var
3. `~/.ttml-publish-key`
4. `.publish-key` next to the script

If none exist, ask the user once: *"I can't find your `BLOG_PUBLISH_API_KEY`. Either (a) set the env var with `setx BLOG_PUBLISH_API_KEY <key>` (PowerShell, then reopen the terminal), or (b) write the key to `~/.ttml-publish-key`. Then say go."*

**Do not** offer to receive the key in chat (it persists in the transcript). File or env var only.

---

## Step 4 — For batch mode: find the markdown files

If the user said "today's posts" or "the YYYY-MM-DD posts" without a `--dir` path, the script auto-detects the blog directory. Order:

1. `TTML_BLOG_DIR` env var (if set)
2. `./blog` (current working directory)
3. `../blog` (one level up — handy when run from a `scripts/` subdir)
4. `<repo-root>/blog` (walks up from the script looking for `.git/`)
5. `~/ttml-app-work/blog`

If none exist, the script errors out with the list it tried. The agent should NOT silently invent a path.

Inside the chosen dir, files must match `YYYY-MM-DD-*.md`. If `--date` is given but no files match, the script prints which dates ARE present so the agent can correct.

---

## Step 5 — Validate before sending (optional fast-fail)

The API will return 400 on bad input, but you can save a round-trip by checking each file's frontmatter first.

**Required** (in JSON or markdown frontmatter):
- `slug` — kebab-case, lowercase, hyphens only, no underscores
- `title` — non-empty
- `content` — JSON only; markdown mode uses everything after the frontmatter

**Optional** with defaults:
- `category` → defaults to `general`. Must be one of the 18 values in `reference/categories.md`.
- `status` → defaults to `published`. Only `draft` or `published` are valid.
- `excerpt`, `metaDescription`, `ogImageUrl`, `authorName`, `tags`, `date` — all optional.

When markdown mode is used and `category:` is missing from frontmatter, the server infers from the first matching `tags` entry (see `reference/categories.md`).

---

## Step 6 — Run the script

```bash
# Batch — today (auto-detects blog dir + key)
python publish-batch.py --today

# Batch — specific date
python publish-batch.py --date 2026-05-24

# Batch — explicit dir
python publish-batch.py --dir /path/to/blog --today

# Single file
python publish-batch.py /path/to/post.md

# Inline JSON (single post, no file)
python publish-batch.py --json '{"slug":"my-slug","title":"Title","content":"# Body","category":"demand-letters","status":"published"}'
```

### Inline markdown from chat (no file on disk yet)

PowerShell:
```powershell
$md = @'
---
slug: paste-slug
title: "Paste title"
description: "Meta desc"
category: demand-letters
status: published
---

# Body markdown here
'@
$tmp = "$env:TEMP\ttml-post.md"
$md | Set-Content -Path $tmp -NoNewline -Encoding UTF8
python publish-batch.py $tmp
Remove-Item $tmp
```

bash:
```bash
TMP=$(mktemp --suffix=.md)
cat > "$TMP" <<'EOF'
---
slug: paste-slug
title: "Paste title"
description: "Meta desc"
category: demand-letters
status: published
---

# Body markdown here
EOF
python publish-batch.py "$TMP" && rm "$TMP"
```

---

## Step 7 — Read the output

The script prints one line per file:

```
Publishing 4 file(s) → https://talk-to-my-lawyer.com/api/blog/publish
  [OK  ] 201 2026-05-25-some-slug.md   {"ok":true,"id":34,"slug":"some-slug","status":"published","action":"created"}
  [OK  ] 200 2026-05-25-other-slug.md  {"ok":true,"id":21,"slug":"other-slug","status":"published","action":"updated"}
  [FAIL] 400 2026-05-25-bad-cat.md     {"error":"Invalid category 'invented'. Must be one of: ..."}
  [OK  ] 201 2026-05-25-fourth.md      {"ok":true,"id":35,...,"action":"created"}

Done. 3/4 succeeded.
```

Exit code is 0 iff every file returned 2xx.

---

## Step 8 — Report results back to the user

After the script returns, summarize cleanly. Don't echo raw JSON — translate it.

> Published 3/4 posts:
> - **created** [some-slug](https://talk-to-my-lawyer.com/blog/some-slug) (id 34)
> - **updated** [other-slug](https://talk-to-my-lawyer.com/blog/other-slug) (id 21)
> - **created** [fourth](https://talk-to-my-lawyer.com/blog/fourth) (id 35)
> - **FAILED** `2026-05-25-bad-cat.md` — `Invalid category 'invented'`. Fix the `category:` field and re-run.

For drafts, note that the URL won't render until status is flipped — drafts live in the DB but `/blog/{slug}` returns 404 publicly.

---

## Step 9 — Failure handling matrix

| Output | Cause | Fix |
|---|---|---|
| `ERROR: no API key` | all 4 sources empty | see Step 3 |
| `HTTP 401 Unauthorized` | local key doesn't match Railway | rotate in Railway → Variables → `BLOG_PUBLISH_API_KEY`, then update local source |
| `HTTP 400 Missing or invalid 'slug'` | frontmatter `slug:` missing | edit .md, re-run |
| `HTTP 400 Invalid category 'x'` | category not in enum | use one from `reference/categories.md`, or drop the field for `general` |
| `HTTP 400 Invalid status 'x'` | typo | only `draft` or `published` |
| `HTTP 404 Application not found` (with `x-railway-fallback: true`) | Railway service down or domain unbound | check Railway dashboard; don't retry blindly |
| `HTTP 500 Internal server error` | DB or upstream failure | retry once. If still failing, check Railway logs for `[blog-publish]` errors |
| `ERROR: no files match YYYY-MM-DD-*.md` | today's blog batch hasn't been generated yet | run `ttml-blog-batch` skill first, or pass `--date` for a date that has files |
| Network timeout | usually Railway cold start | retry; second call almost always succeeds within 5s |

Re-running is always safe — the endpoint upserts by slug.

---

## Step 10 — When NOT to use this skill

- **Generating new content from scratch** → use `ttml-blog-batch` first to write `.md` files, then chain into this skill to publish.
- **Editing posts already on the site** → still use this skill; the upsert updates the row. No DELETE endpoint exists.
- **Adding posts to git history** → this skill doesn't commit. If you want both (live + in repo), publish via this skill AND `git add/commit/push` the .md files separately. The repo's `sync-blog.yml` Action will be a no-op since the slug is already in the DB.

---

## Relationship to other skills

- **`ttml-blog-batch`** generates today's 4 markdown files. Should run BEFORE this skill on daily-batch days. Chain: `ttml-blog-batch` → `blog-poster --today`.
- **`ttml-ceo`** owns strategy. Can call this skill tactically.
                                                                                                                                                                                                                                                                                                                    