---
name: kouji:apply
description: Use when the user wants to auto-apply to LinkedIn jobs already in their tracker, when kouji:hunter triggers auto_apply after a search, or when the user says "apply to jobs", "submit applications", "auto apply", "easy apply".
---

# Kouji Apply

Auto-applies to jobs in `## Active (not yet applied)` via LinkedIn Easy Apply. Can be invoked directly or chained from `kouji:hunter`.

## Prerequisites

- User must be logged into LinkedIn in Chrome.
- Jobs must exist in `## Active (not yet applied)` section of `jobs.md`.
- `criteria.yaml#resume_path` must point to a valid resume file.

## Flow

1. Read `jobs.md` → collect all rows from `## Active (not yet applied)`. Sort oldest-logged first.
2. Read `criteria.yaml` for: `auto_apply_max` (default 5 if unset), `work_authorization`, `notice_period`, `resume_path`, `exclude_companies`.
3. For each job, up to `auto_apply_max`:
   a. Navigate to job URL via `mcp__claude-in-chrome__navigate`.
   b. Look for **Easy Apply** button. If absent (external apply only), write `YYYY-MM-DD: needs-manual-apply` to History and skip — do not attempt external site applications.
   c. Click Easy Apply. Handle multi-step modal:
      - **Contact info** — confirm pre-filled values from profile.
      - **Resume** — upload file at `resume_path` if prompted; select existing if already uploaded.
      - **Work authorization** — answer from `criteria.yaml#work_authorization`.
      - **Screening questions** — answer from the table below. If a question cannot be answered from known data, pause and ask the user before continuing.
      - **Review** — confirm all fields are correct before submit.
   d. Click Submit. Wait for the confirmation screen.
   e. If confirmation received: move row to `## Applied` in `jobs.md`, set `Updated` = today, overwrite History with `YYYY-MM-DD: applied via Easy Apply`.
   f. If submit fails or no confirmation: write `YYYY-MM-DD: apply-failed — <reason>` to History. Do not retry.
4. Report: N applied, M skipped (no Easy Apply), K paused (unknown answer), L failed.

## Screening question answers

| Question type | Source |
|---|---|
| Years of experience in X | `context.md` → Strengths / Experience-domains |
| Current location / relocation | `criteria.yaml` → defaults.locations (first entry = current) |
| Work authorization / visa | `criteria.yaml` → work_authorization |
| Salary expectation | `criteria.yaml` → defaults.salary_min_k (use as floor; add 10–20% for expectation) |
| Notice period | `criteria.yaml` → notice_period |
| Remote / hybrid / onsite preference | `criteria.yaml` → defaults.remote |

If the question type is not in this table and the answer is not obvious from context → **pause and ask the user**.

## Hard rules

- **Never submit without a confirmation screen.** Failed submits → mark failed, move on.
- **Never invent answers.** Unknown required field → pause, ask user.
- **Respect `exclude_companies`.** Skip jobs from excluded companies even if they passed hunter's filter.
- **Cap at `auto_apply_max`** per run. Prevents runaway applications during cron-fired runs.
- **Do not apply to the same job twice.** If job URL already appears in `## Applied`, skip it.

## File integrity

Read `jobs.md` whole → modify in memory → write whole. Moving a row between sections means deleting from source section and appending to destination section. Validate column counts before writing.

## References (at plugin root `references/`)

- `criteria-yaml-schema.md` — criteria.yaml fields including auto_apply extensions
- `context-md-schema.md` — Strengths / Experience-domains used for screening answers
- `jobs-md-schema.md` — jobs.md section structure and row format
