import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// Source contract for 0051. Runtime behaviour (who is notified, what a client
// can update, which company a lead joins, onboarding with an existing contact,
// the last admin) is proven in
// supabase/tests/0051_data_map_access_fixes.test.sql under `pnpm test:db`.
//
// Each replaced function must be the CURRENT final definition plus only the
// change its fix needs, so the tests below rebuild the new body from the old
// one with the documented edits and compare the two.

const DIR = 'supabase/migrations';
const MIGRATION = `${DIR}/0051_data_map_access_fixes.sql`;

function statementsOf(sql) {
  return sql
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function block(sql, header, terminator) {
  const start = sql.indexOf(header);
  assert.ok(start >= 0, `${header} is defined`);
  const end = sql.indexOf(terminator, start + header.length);
  assert.ok(end > start, `${header} has a closed body`);
  return sql.slice(start, end + terminator.length);
}

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

// The old body with each documented edit applied. A missing anchor fails, so
// the edit list cannot drift from the file it describes.
function applyEdits(oldBody, edits) {
  let text = normalize(oldBody);
  for (const [from, to] of edits) {
    const anchor = normalize(from);
    assert.ok(text.includes(anchor), `old body contains: ${anchor}`);
    text = text.replace(anchor, () => normalize(to));
  }
  return text;
}

const read = async (name) => statementsOf(await readFile(`${DIR}/${name}`, 'utf8'));

// Each function, the migration that holds the definition 0051 starts from, and
// how that definition opens and closes.
const REPLACED = {
  recipients: {
    prior: '0046_client_notifications_and_hardening.sql',
    header: 'create or replace function private.project_notification_recipients(',
    end: '$$;',
    names: ['project_notification_recipients'],
  },
  approval: {
    prior: '0015_project_notifications_and_message_editing.sql',
    header: 'create or replace function public.update_project_approval(',
    end: '$function$;',
    names: ['update_project_approval'],
  },
  task: {
    prior: '0012_project_task_update_fixes.sql',
    header: 'create or replace function public.update_project_task(',
    end: '$function$;',
    names: ['update_project_task'],
  },
  lead: {
    prior: '0029_lead_capture_review_followups.sql',
    header: 'CREATE OR REPLACE FUNCTION public.create_lead_from_contact(',
    end: '$fn$;',
    names: ['create_lead_from_contact'],
  },
  onboard: {
    prior: '0046_client_notifications_and_hardening.sql',
    header: 'create or replace function public.onboard_client_company(',
    end: '$function$;',
    names: ['onboard_client_company'],
  },
  resolve: {
    prior: '0014_signup_account_type_and_single_admin.sql',
    header: 'CREATE OR REPLACE FUNCTION public.admin_resolve_staff_request(',
    end: '$$;',
    names: ['admin_resolve_staff_request'],
  },
};

async function bodies(key) {
  const { prior, header, end } = REPLACED[key];
  const next = block(await read('0051_data_map_access_fixes.sql'), header, end);
  const old = block(await read(prior), header, end);
  return { next, old };
}

test('0051 redefines exactly the six functions and changes no table, policy, index or event type', async () => {
  const sql = await read('0051_data_map_access_fixes.sql');

  const defined = [...sql.matchAll(/create or replace function ([a-z_.]+)\(/gi)].map((match) => match[1].toLowerCase());
  assert.deepEqual(defined.sort(), [
    'private.project_notification_recipients',
    'public.admin_resolve_staff_request',
    'public.create_lead_from_contact',
    'public.onboard_client_company',
    'public.update_project_approval',
    'public.update_project_task',
  ]);
  assert.doesNotMatch(sql, /^\s*create function/im, 'functions use create or replace, so grants and comments survive');
  assert.doesNotMatch(sql, /\b(create|alter|drop)\s+(table|policy|index|unique index|trigger|type|extension)\b/i);
  assert.doesNotMatch(sql, /audit_events_event_type_check/, 'no new audit event type, so the allow-list is untouched');

  // Outside the function bodies there is only DDL for the functions: no row is
  // inserted, updated or deleted when the file is applied.
  const outsideBodies = sql.replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, '');
  assert.doesNotMatch(outsideBodies, /\b(insert into|update|delete from)\b/i);
});

test('the header explains each fix and says the owner applies the file after review', async () => {
  const header = (await readFile(MIGRATION, 'utf8')).split('\n').filter((line) => line.startsWith('--')).join('\n');

  for (const fix of ['D1', 'D2', 'D3', 'D4', 'D6', 'D7']) {
    assert.match(header, new RegExp(`-- ${fix}\\. `), `${fix} is described`);
  }
  assert.match(header, /owner action after\s*--\s*review: merging the PR deploys the app but does not run SQL/);
});

test('every function starts from its latest earlier definition, not an older one', async () => {
  const files = (await readdir(DIR)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  const own = '0051_data_map_access_fixes.sql';

  for (const [key, { prior, names }] of Object.entries(REPLACED)) {
    const between = files.filter((name) => name > prior && name < own);
    for (const file of between) {
      const sql = await read(file);
      for (const name of names) {
        assert.doesNotMatch(
          sql,
          new RegExp(`create (or replace )?function (public\\.|private\\.)?${name}\\(`, 'i'),
          `${file} must not redefine ${name}: 0051 would start from a stale body (${key} is based on ${prior})`,
        );
      }
    }
  }
});

test('D2 recipients: staff while still staff, clients only, and the admin fallback follows current staff', async () => {
  const { next, old } = await bodies('recipients');
  const staff = `staff.role in ('project_manager'::public.user_role, 'admin'::public.user_role)`;

  assert.equal(
    normalize(next),
    applyEdits(old, [
      [
        `select assignment.user_id
         from public.project_assignments as assignment
         where assignment.project_id = p_project_id
           and assignment.user_id <> p_exclude_user_id
         union`,
        `select assignment.user_id
         from public.project_assignments as assignment
         join public.profiles as staff on staff.id = assignment.user_id
         where assignment.project_id = p_project_id
           and assignment.user_id <> p_exclude_user_id
           and ${staff}
         union`,
      ],
      [
        `and profile.id <> p_exclude_user_id
           and p_visibility is distinct from 'internal'`,
        `and profile.id <> p_exclude_user_id
           and profile.role = 'client'::public.user_role
           and p_visibility is distinct from 'internal'`,
      ],
      [
        `and not exists (
           select 1
           from public.project_assignments as assignment
           where assignment.project_id = p_project_id
         )`,
        `and not exists (
           select 1
           from public.project_assignments as assignment
           join public.profiles as staff on staff.id = assignment.user_id
           where assignment.project_id = p_project_id
             and ${staff}
         )`,
      ],
    ]),
  );

  const sql = await read('0051_data_map_access_fixes.sql');
  assert.match(sql, /returns table \(user_id uuid\)\s*language sql\s*security definer\s*set search_path to 'pg_catalog', 'public', 'private', 'storage'/);
  // Still not callable by anyone but its owner.
  assert.match(sql, /revoke all on function private\.project_notification_recipients\(uuid, uuid, text\)\s*from public, anon, authenticated;/);
  assert.doesNotMatch(sql, /grant execute on function private\.project_notification_recipients/);
});

test('D1 approval decisions notify by the deliverable visibility and carry the decision note', async () => {
  const { next, old } = await bodies('approval');

  assert.equal(
    normalize(next),
    applyEdits(old, [
      [`v_project_id uuid; begin`, `v_project_id uuid; v_visibility text; v_note text; begin`],
      [
        `v_project_id := v_approval.project_id;`,
        `v_project_id := v_approval.project_id;
         v_note := btrim(coalesce(p_note, ''));
         select deliverable.visibility
         into v_visibility
         from public.project_deliverables as deliverable
         where deliverable.id = v_approval.deliverable_id;
         v_visibility := coalesce(v_visibility, 'shared');`,
      ],
      [`note = btrim(coalesce(p_note, '')),`, `note = v_note,`],
      [`'note', v_approval.note)`, `'note', v_note)`],
      [
        `from private.project_notification_recipients(v_project_id, v_user_id) as recipient`,
        `from private.project_notification_recipients(v_project_id, v_user_id, v_visibility) as recipient`,
      ],
    ]),
  );

  // The old requester note is never what gets sent, and a deliverable-less
  // approval keeps its 'shared' default (the 0041 read policy shows it to all).
  assert.doesNotMatch(next, /'note', v_approval\.note/);
  assert.match(next, /v_visibility := coalesce\(v_visibility, 'shared'\);/);
  assert.match(next, /raise exception 'Project assignment required\.' using errcode = '42501';/);
});

test('D3 task updates: clients see shared tasks only and never assign, assignees are staff on the project, completed_at is kept', async () => {
  const { next, old } = await bodies('task');

  assert.equal(
    normalize(next),
    applyEdits(old, [
      [`v_task public.project_tasks%rowtype; begin`, `v_task public.project_tasks%rowtype; v_is_staff boolean; begin`],
      [
        `if v_task.assignee_id is not null and v_task.assignee_id <> v_user_id then`,
        `v_is_staff := coalesce(private.can_view_internal(v_task.project_id), false);
         if not v_is_staff then
           if v_task.client_visible is not true then
             raise exception 'Task not found.' using errcode = 'P0002';
           end if;
           if p_assignee_id is not null and p_assignee_id is distinct from v_task.assignee_id then
             raise exception 'Only staff can assign a task.' using errcode = '42501';
           end if;
         end if;
         if v_task.assignee_id is not null and v_task.assignee_id <> v_user_id then`,
      ],
      [
        `v_task.status := p_status;`,
        `v_task.status := p_status;
         v_task.completed_at := case
           when p_status = 'done' then coalesce(v_task.completed_at, now())
           else null
         end;`,
      ],
      [
        `if p_assignee_id is not null then
           v_task.assignee_id := p_assignee_id;
         end if;`,
        `if p_assignee_id is not null and p_assignee_id is distinct from v_task.assignee_id then
           if not (
             exists (
               select 1
               from public.profiles as profile
               where profile.id = p_assignee_id
                 and profile.role = 'admin'::public.user_role
             )
             or exists (
               select 1
               from public.project_assignments as assignment
               join public.profiles as profile on profile.id = assignment.user_id
               where assignment.project_id = v_task.project_id
                 and assignment.user_id = p_assignee_id
                 and profile.role = 'project_manager'::public.user_role
             )
           ) then
             raise exception 'Task assignee must be an admin or a project manager assigned to this project.'
               using errcode = '22023';
           end if;
           v_task.assignee_id := p_assignee_id;
         end if;`,
      ],
      [`due_date = v_task.due_date, updated_at = v_task.updated_at`, `due_date = v_task.due_date, completed_at = v_task.completed_at, updated_at = v_task.updated_at`],
    ]),
  );

  // The client gate runs before any field is read or written.
  assert.ok(next.indexOf('v_is_staff :=') < next.indexOf('if p_title is not null'));
  assert.ok(next.indexOf('v_is_staff :=') > next.indexOf('Project access required.'));
  // Same statuses as the table check and 0011's completed_at rule: set on done only.
  assert.match(next, /p_status not in \('todo', 'in_progress', 'review', 'done', 'blocked'\)/);
  assert.match(next, /when p_status = 'done' then coalesce\(v_task\.completed_at, now\(\)\)\s+else null/);
});

test('D4 lead capture never joins a company that has a client account, and the match is deterministic', async () => {
  const { next, old } = await bodies('lead');
  const guard = `AND NOT EXISTS (
          SELECT 1
          FROM public.profiles client_profile
          WHERE client_profile.company_id = co.id
            AND client_profile.role = 'client'::public.user_role
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.company_members member
          WHERE member.company_id = co.id
        )
      ORDER BY co.created_at, co.id
      LIMIT 1;`;

  assert.equal(
    normalize(next),
    applyEdits(old, [
      [`WHERE lower(co.name) = lower(v_company_input) LIMIT 1;`, `WHERE lower(co.name) = lower(v_company_input) ${guard}`],
      [`WHERE lower(split_part(co.email, '@', 2)) = v_domain LIMIT 1;`, `WHERE lower(split_part(co.email, '@', 2)) = v_domain ${guard}`],
    ]),
  );

  // Both company matches are guarded; the per-email lock and the existing
  // contact lookup are exactly as 0029 left them.
  assert.equal([...next.matchAll(/client_profile\.company_id = co\.id/g)].length, 2);
  assert.equal([...next.matchAll(/ORDER BY co\.created_at, co\.id/g)].length, 2);
  assert.match(next, /pg_advisory_xact_lock\(hashtext\('create_lead_from_contact'\), hashtext\(v_email\)\)/);
  assert.match(next, /SET search_path = pg_catalog, public, extensions/);

  // Service role only, as before: never granted to an API role.
  const sql = await read('0051_data_map_access_fixes.sql');
  for (const role of ['PUBLIC', 'anon', 'authenticated']) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.create_lead_from_contact\\(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT\\) FROM ${role};`));
  }
  assert.doesNotMatch(sql, /grant execute on function public\.create_lead_from_contact/i);
});

test('D6 onboarding skips a duplicate contact and never joins or moves an existing one', async () => {
  const { next, old } = await bodies('onboard');

  assert.equal(
    normalize(next),
    applyEdits(old, [
      [
        `'client', v_user_id ); insert into public.company_members`,
        `'client', v_user_id ) on conflict (lower(email)) where email is not null do nothing; insert into public.company_members`,
      ],
    ]),
  );

  // The only company the account is linked to is the one created above.
  assert.match(next, /insert into public\.companies \(name, email, phone, created_by\)[\s\S]*returning id into v_company_id;/);
  assert.doesNotMatch(next, /update public\.contacts|do update/i, 'an existing contact is never moved or changed');
  assert.match(next, /raise exception 'You are already linked to a company\.' using errcode = '23505';/);

  // The 2-argument overload (0016) only delegates, so it is not redefined.
  const sql = await read('0051_data_map_access_fixes.sql');
  assert.doesNotMatch(sql, /onboard_client_company\(p_name text, p_email text\)/i);
  assert.match(sql, /grant execute on function public\.onboard_client_company\(text, text, text\) to authenticated;/);
  assert.match(sql, /revoke all on function public\.onboard_client_company\(text, text, text\) from anon;/);
});

test('D7 staff requests never change an admin role, and approval still grants project_manager only', async () => {
  const { next, old } = await bodies('resolve');

  assert.equal(
    normalize(next),
    applyEdits(old, [
      [
        `WHEN p_approve THEN 'project_manager'::public.user_role`,
        `WHEN p_approve AND role <> 'admin'::public.user_role THEN 'project_manager'::public.user_role`,
      ],
    ]),
  );

  assert.doesNotMatch(next, /then 'admin'::public\.user_role/i, 'the admin role is not reachable from this path');
  assert.match(next, /IF auth\.uid\(\) IS NULL OR NOT public\.is_admin\(\) THEN/);
  assert.match(next, /SET search_path = pg_catalog, public/);

  const sql = await read('0051_data_map_access_fixes.sql');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.admin_resolve_staff_request\(UUID, BOOLEAN\) TO authenticated;/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_resolve_staff_request\(UUID, BOOLEAN\) FROM anon;/);
});

test('approval and task RPCs restate their grants after the bodies: authenticated only', async () => {
  const sql = await read('0051_data_map_access_fixes.sql');

  for (const [name, args] of [
    ['update_project_approval', 'uuid, text, text'],
    ['update_project_task', 'uuid, text, text, text, uuid, date'],
  ]) {
    const bodyEnd = sql.indexOf('$function$;', sql.indexOf(`create or replace function public.${name}(`));
    const escaped = args.replace(/[()]/g, '\\$&');
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\(${escaped}\\) from public;`));
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\(${escaped}\\) from anon;`));
    const grant = sql.indexOf(`grant execute on function public.${name}(${args}) to authenticated;`);
    assert.ok(grant > bodyEnd, `${name} grant follows its body`);
  }
});

test('every replaced body is SECURITY DEFINER with a pinned search_path', async () => {
  for (const key of Object.keys(REPLACED)) {
    const { next } = await bodies(key);
    const head = next.slice(0, next.search(/\$(fn|function)?\$/i) + 12);
    assert.match(head, /security definer/i, `${key} stays SECURITY DEFINER`);
    assert.match(head, /set search_path\s*(=|to)\s*'?pg_catalog'?/i, `${key} keeps a pinned search_path`);
  }
});
