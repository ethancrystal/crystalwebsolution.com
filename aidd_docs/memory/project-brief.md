# Project Brief

## What it is

- The website and client portal for CD Sportswear INC. It has two halves: a cinematic, scroll-driven WebGL agency homepage with inner marketing pages, and a Supabase-backed CRM with three roles.
- Live at `https://www.cdsportswearinc.com`. The repo is `ethancrystal/crystalwebsolution.com`. That name is the repo and a retired domain, never the business name.

## Why it exists

- The marketing site wins projects: it showcases motion and 3D craft, and it captures leads through the contact form.
- The CRM takes in incoming and current clients and supports collaboration with them while a project is running: briefs, threads, files, tasks, approvals and deliverables.

## Domain language

| Term | Meaning |
| ---- | ------- |
| beat | One scroll section of the homepage (Hero, About, Services, Approach, Stories, Mark, Lab, Motion, Contact) |
| stop / cluster | A camera waypoint per beat, and the z-depth where that beat's 3D actors live (`lib/journey.js`) |
| stage | The procedural hero background on an inner marketing page (`about`, `services`, `process`, `contact`) |
| portal | The CRM entry for a role: client, employee (`project_manager`) or admin |
| shared / internal | Message and file visibility on a project. Clients see `shared` only. |
| staff request | A signup that picked "employee". It raises `requested_staff_access` until an admin resolves it. |
| outbox | `notifications_outbox`, the queued email and in-app notifications drained by the cron route |

## Key features

- A homepage camera journey through one continuous 3D space, driven by scroll.
- Inner marketing pages: services, work, process, reviews, blog, contact and landing pages.
- A contact form that creates a CRM lead and emails operations.
- CRM client dashboard: briefs and projects.
- CRM team workspace: assigned projects.
- CRM admin: companies, contacts, deals pipeline, tasks, projects, users and invites, and blog posts.
