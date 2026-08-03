---
name: kouji:hunter
description: Use when the user wants to search LinkedIn for new job matches, configure search criteria, manage their candidate profile context, or schedule daily job searches. Trigger on "find jobs", "search linkedin", "match my resume", "edit criteria", "rebuild context", "schedule daily hunt".
---

# Kouji Hunter

Searches LinkedIn for matching jobs and appends de-duplicated results to `jobs.md`. Invokes `kouji:apply` automatically when `auto_apply: true`.

## Mode routing

| User says | Mode |
|---|---|
| "find jobs", "search linkedin", "match my resume" | search |
| "show criteria", "edit criteria", "add keyword" | criteria |
| "rebuild context", "show context", "edit context" | context |
| "summarize config", "what queries" | summarize |
| "schedule daily", "automate search" | schedule |

If ambiguous, default to **search** — unless `jobs.md` is already populated, then ask search or followup.

## Setup (first run only)

If `criteria.yaml` missing in the target folder:

1. Ask user for job hunt folder (suggest `Desktop\jobs\` on Windows, `~/jobs/` elsewhere).
2. Write starter `criteria.yaml` seeded from resume in cwd if present. Schema: `references/criteria-yaml-schema.md` at plugin root.
3. Generate `context.md` from resume. Schema: `references/context-md-schema.md` at plugin root.
4. Write empty `jobs.md`. Schema: `references/jobs-md-schema.md` at plugin root.
5. Show both generated files, invite edits before first search.

## Mode: search

1. Read `criteria.yaml` → build keyword × location cartesian product.
2. Parse `jobs.md` → collect all logged LinkedIn job IDs into a dedup set.
3. Confirm LinkedIn login (`linkedin.com/feed` reachable); abort and tell user to log in if not.
4. For each (keyword, location) pair, build URL per `references/search-patterns.md`. Use `mcp__claude-in-chrome__browser_batch` per query. Extract: job ID, title, company, location, posted-time.
5. Filter in order:
   - `exclude_titles` / `exclude_keywords_in_title` (case-insensitive substring on title)
   - `exclude_companies` (case-insensitive exact)
   - `exclude_domains` (judgment-based; see schema for rules — never blind substring match)
   - Salary hard floor: drop if published max < `defaults.salary_min_k`; jobs with no published salary pass through
6. Read `context.md` → score survivors: +2 Strengths hit, +1 Interests, +1 Experience-domains, −1 Anti-preferences. Tiebreak: recency.
7. Append new jobs (rank order) to `## Active (not yet applied)` in `jobs.md`. Columns per `references/jobs-md-schema.md`. Stop appending when `max_jobs_per_run` new jobs reached; halt query loop there.
8. Update `Last search:` timestamp at top of `jobs.md`.
9. Report: N queries ran / M planned, K new jobs added, J already known, excluded jobs (collapsible block: `Excluded [Title] @ [Company] — domain: [domain]`).
10. **Auto-apply:** if `auto_apply: true` in `criteria.yaml`, invoke `kouji:apply` after report.

**Cap counts only new jobs.** Already-known jobs do not count toward `max_jobs_per_run` — otherwise the daily cron would hit the cap on the first query and never explore new keyword/location pairs.

## Mode: criteria

1. Read `criteria.yaml`.
2. Apply user changes. Validate against `references/criteria-yaml-schema.md` — push back on unknown fields unless user explicitly extends the schema.
3. Write back. Show summary (not raw YAML, not a diff).
4. Ask if user wants to re-run search. Do not auto-run.

**New fields for auto_apply support** (add to `criteria.yaml` if not present):
- `auto_apply: false` — set true to trigger `kouji:apply` after each search
- `auto_apply_max: 5` — cap on applications per run
- `work_authorization: citizen` — used in screening questions (citizen / permanent_resident / visa_required)
- `notice_period: immediate` — used in screening questions

## Mode: context

- **show** — print `context.md` formatted nicely. Offer to generate if missing.
- **rebuild** — regenerate from `criteria.yaml#resume_path`. If `Manually edited: yes`, confirm before overwriting. Set `Manually edited: no` after rebuild.
- **edit** — apply user change inline. Set `Manually edited: yes`.

On every search: compare resume mtime vs context.md mtime. Warn once if resume is newer — don't auto-rebuild.

## Mode: summarize

Collapse `criteria.yaml` to ≤8 lines of prose. No raw YAML.

1. One sentence: total query count (keywords × locations), shared defaults (remote/recency/contract/salary).
2. Two short lines: keywords list, locations list.
3. One line: exclude counts by category (don't enumerate keywords, just counts and domain names).
4. Caveats only if non-obvious.

## Mode: schedule

Present three options; let user choose.

| Option | Persistence | Best for |
|---|---|---|
| `CronCreate` | Session-only (dies when Claude Code exits) | Trying it out |
| Windows Task Scheduler | Persistent, survives reboots | Daily on own machine |
| `/schedule` remote agent | Cloud-persistent, machine-off | Hands-off runs |

**CronCreate:** `cron: "3 9 * * *"`, `recurring: true`, `durable: true`, prompt invokes `kouji:hunter` in search mode. Be honest: it expires when the session closes.

**Windows Task Scheduler:** write `<folder>/run-hunt.ps1` → `claude -p --model haiku "Run kouji:hunter in search mode against folder <folder>"`. Register: `schtasks /Create /SC DAILY /ST 09:03 /TN "kouji-hunt" /TR "powershell -NoProfile -File <folder>\run-hunt.ps1" /F`. Verify `claude` is on PATH before writing the task.

## File integrity

Read `jobs.md` whole → modify in memory → write whole. Never partial-edit. Validate all rows have 7 columns and the title cell URL contains a numeric job ID before writing.

## Common pitfalls

| Pitfall | Counter |
|---|---|
| LinkedIn returns ~7 results only | User is logged out — verify first |
| Same job logged twice | Dedup by job ID, not title+company |
| YAML field renamed by user | Schema-validate on load, refuse with clear error |
| Resume newer than context.md | Warn once, let user decide whether to rebuild |

## References (at plugin root `references/`)

- `criteria-yaml-schema.md` — full criteria.yaml schema with examples
- `context-md-schema.md` — context.md schema + extraction from resume + matching/ranking logic
- `jobs-md-schema.md` — exact jobs.md structure and sample entry
- `search-patterns.md` — LinkedIn search URL templates and DOM extraction snippets
