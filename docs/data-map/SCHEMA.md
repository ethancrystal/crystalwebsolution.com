# Data map: manifest format

The machine-readable map lives in `docs/data-map/data/*.json`, one fragment per
domain. `node scripts/data-map.mjs` merges the fragments into
`docs/data-map/data-map.json`, validates them, and renders
`docs/data-map/04-externalities.md`. `tests/data-map.test.mjs` runs the same
validation in `pnpm test`, so the map cannot drift from the code silently.

## Fragment shape

```json
{
  "domain": "db",
  "description": "one line",
  "nodes": [ { "id": "table:public.projects", "type": "table", "label": "projects", "file": "supabase/migrations/0009_project_platform.sql", "attrs": {} } ],
  "edges": [ { "from": "action:app/actions/project-actions.js#createProject", "to": "fn:public.create_project", "kind": "calls", "fields": ["p_title"], "via": "user", "when": "", "source": "app/actions/project-actions.js#createProject", "notes": "" } ]
}
```

Only `id` and `type` are required on a node. `from`, `to`, `kind` and `source`
are required on an edge.

## Direction rule

An edge points the way the data moves. A write is `writer -> table`. A read is
`table -> reader`. A foreign key is `parent -> child`, because deleting the
parent is what reaches the child. Follow edges forward to answer "what does
this input affect?" and backward to answer "where does this value come from?".

## Node types (id prefix = type)

| Prefix | Meaning | Example |
| --- | --- | --- |
| `table:` | Postgres table | `table:public.projects` (`attrs.columns`: `[{name,type,nullable,default,check}]`) |
| `fn:` | SQL function or RPC | `fn:public.create_project`, `fn:private.can_access_project` (`attrs.security`: `definer`/`invoker`, `attrs.grants`) |
| `trigger:` | SQL trigger | `trigger:public.projects.broadcast_project_status_changed` |
| `bucket:` | Storage bucket | `bucket:project-files` |
| `realtime:` | Realtime channel or publication | `realtime:project:{id}`, `realtime:publication.project_messages` |
| `cron:` | Scheduler | `cron:pg_cron.drain-crm-outbox`, `cron:vercel.crm-notifications` |
| `action:` | Exported server action | `action:app/actions/project-actions.js#createProject` |
| `route:` | Route handler, `METHOD path` | `route:POST /api/contact` |
| `middleware:` | Edge middleware or host redirect layer | `middleware:middleware.js`, `middleware:lib/portalHost.mjs` |
| `page:` | App Router page, by URL pattern | `page:/admin/deals/[id]` |
| `component:` | React component or hook file | `component:components/crm/ProjectThread.jsx` |
| `lib:` | Library module or symbol | `lib:lib/crm/projects.js#getProjectWorkspace` |
| `email:` | Email template | `email:lib/email/templates.js#projectMessageEmail` |
| `ext:` | External service | `ext:resend`, `ext:hcaptcha`, `ext:upstash`, `ext:sentry`, `ext:ga4`, `ext:gtm`, `ext:trustpilot`, `ext:supabase-auth`, `ext:contact-webhook` |
| `env:` | Environment variable | `env:NEXT_PUBLIC_APP_URL` (`attrs.public`, `attrs.runtime`: `server`/`edge`/`client-inlined`) |
| `cookie:` | Cookie | `cookie:sb-<ref>-auth-token` |
| `storage:` | Browser storage key | `storage:local:cws:analytics-consent` |
| `param:` | URL parameter that carries data | `param:next`, `param:reason` |
| `workflow:` | CI workflow | `workflow:.github/workflows/seo-publish-blog.yml` |
| `script:` | Repo script | `script:scripts/provision-crm-test-users.mjs` |
| `singleton:` | Per-frame singleton field | `singleton:scrollState.progress` |
| `input:` | Browser or environment input | `input:browser.scroll`, `input:media.prefers-reduced-motion` |
| `actor:` | WebGL actor or DOM sink fed by singletons | `actor:components/three/CameraRig.jsx` |
| `event:` | Analytics event | `event:ga4.generate_lead` |

## Edge kinds

| Kind | Meaning |
| --- | --- |
| `submits` | UI sends user input to an action or route. `fields` lists the form fields. |
| `calls` | Code or SQL invokes an action, route, function or RPC. `fields` lists the arguments. |
| `inserts`, `updates`, `deletes`, `upserts` | Write to a table. `fields` lists the columns written. |
| `reads` | `table -> reader`. `fields` lists the columns selected. |
| `fires` | `table -> trigger`. `when` names the event, e.g. `AFTER UPDATE OF status`. |
| `fk` | `parent -> child`. `attrs.onDelete`: `cascade`, `set null`, `restrict` or `no action`. |
| `enqueues` | A write that queues work (outbox rows, cleanup rows). |
| `drains` | `queue table -> worker` that consumes it. |
| `sends` | `-> email:` or `-> ext:` outbound message or HTTP call. |
| `broadcasts` | `-> realtime:` channel. |
| `delivers` | `realtime: -> subscriber`. |
| `uploads`, `signs-url` | Storage object write; signed URL issue (`bucket -> caller`). |
| `redirects` | `-> page:`. `when` holds the condition. |
| `sets`, `gets` | Cookie, browser storage or URL param write and read. |
| `configures` | `env: -> consumer`. |
| `emits` | `-> event:` or `-> ext:sentry`. |
| `writes`, `feeds` | Per-frame pipeline: `input -> singleton`, `singleton -> actor`. |

`via` names who performs the operation: `user` (RLS applies), `service_role`
(RLS bypassed), `definer` (SECURITY DEFINER function), `anon`, `browser`,
`server`, `edge`.

## Who owns which node

Each node is defined in exactly one fragment. Other fragments may point edges
at it by id without defining it again. An edge lives in the fragment whose code
its `source` cites.

| Fragment | Owns |
| --- | --- |
| `db.json` | `table:`, `trigger:`; `fk` and `fires` edges; trigger-to-function edges. Top-level `dropped: {tables, functions, triggers}` lists objects a later migration removed. |
| `db-logic.json` | `fn:`, `bucket:`, `realtime:` (publication and the broadcast topics that triggers send to), `cron:pg_cron.*`; function-to-table and function-to-function edges |
| `server.json` | `action:`, `route:`, `middleware:`, `email:`, `param:`, `cookie:sb-*` (auth cookies), `lib:` for `lib/supabase/*`, `lib/auth/*`, `lib/email/*`, `lib/rateLimit.mjs`, `lib/hcaptcha.mjs`, `lib/contactForm.mjs`, `lib/crm/notification-copy.mjs`, `lib/portalHost.mjs`, `lib/crmFlag.js`, `lib/auth-errors.js` |
| `ui.json` | `page:` for CRM and auth routes, `component:` under `components/crm/` and `components/auth/`, `lib:` for `lib/crm/*` read models, `lib/crm/projectRealtime.js`, `lib/useUserRole.js` |
| `external.json` | `ext:`, `env:`, `cron:vercel.*`, `workflow:`, `script:`, `event:`, `storage:`, cookies other than `sb-*`, `page:` for marketing routes, `component:` for marketing, analytics and consent components, `lib:` for static content, SEO and analytics modules |
| `frame.json` | `singleton:`, `input:`, `actor:`, `component:` for `components/three/`, `components/sections/` and the scroll/scene shell, `lib:` for per-frame modules |

## `source` format

- App code: `path#symbol`, where `symbol` is a name that appears in the file
  (function, export, component or constant). Symbols survive edits that move
  lines.
- SQL migrations: `path:line`. Migrations are never edited after they ship,
  so their line numbers are stable.
- Anything else: `path` alone.

The validator checks that the file exists, that `#symbol` appears in it, and
that `:line` is within the file.
