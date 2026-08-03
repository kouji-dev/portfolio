# jobs.md schema

Source of truth for the job hunt. One markdown file. Each status is a section containing a table — one row per job. Optimized for scanning, easy to edit by hand, easy to parse.

## Top of file (always present)

```markdown
# Job Hunt Tracker

- **Folder:** C:\Users\<you>\jobs
- **Last search:** 2026-05-07 14:32
- **Last followup:** 2026-05-07 09:00

---
```

## Section skeleton (all 8 sections always present, even when empty)

```markdown
## Active (not yet applied)

## Applied

## Interviewing

## Offer

## Accepted

## Rejected

## Withdrawn

## Closed (job posting taken down)
```

Empty sections have just the heading + a single blank line below. Never omit a section — the parser relies on all 8 headings being present.

## Table format

Every section that contains jobs has exactly one table. Header row is fixed — always these columns in this order:

```markdown
| Title | Company | Location | Logged | Updated | Why match | History |
|---|---|---|---|---|---|---|
| [Senior Fullstack Software Engineer – AI Copilot](https://www.linkedin.com/jobs/view/4000000001/) | ExampleCorp | Portugal (remote) | 2026-05-07 | — | Direct hit — full-stack + AI copilot aligns with AI-driven apps positioning. | 2026-05-07: logged |
```

### Column semantics

| Column | Format | Notes |
|---|---|---|
| Title | `[<title>](<linkedin url>)` | The URL embeds the LinkedIn job ID — that's the dedup key (parser extracts `/jobs/view/(\d+)/`). |
| Company | plain text | As shown on LinkedIn. |
| Location | plain text | LinkedIn label including `(remote)` suffix. Translation-agnostic. |
| Logged | `YYYY-MM-DD` | Date the row was first added by `search` mode. Never edited after creation. |
| Updated | `YYYY-MM-DD` or `—` | Date of the last status transition. `—` means the job is still in its initial logged status. |
| Why match | one short sentence | Written by `search` from `context.md` — must reference a Strength or Interest, not be generic. User can edit. |
| History | one short line | The most recent event only. Format `YYYY-MM-DD: <event>`. Examples: `2026-05-07: logged`, `2026-05-08: applied (Easy Apply)`, `2026-05-12: checked, no change`, `2026-05-15: recruiter screen 2026-05-18`. Older events are not retained — this is intentional, jobs.md is a tracker not an audit log. |

### Pipe escaping

Job titles or other cells containing literal `|` characters must escape them as `\|` (markdown table syntax). The parser must handle this.

## Status ↔ section mapping

The section a row sits in IS the row's status. There is no separate `Status:` field. On a status transition, move the row from the old section's table to the new section's table and update the `Updated` and `History` cells.

| Status | Section heading |
|---|---|
| active | Active (not yet applied) |
| applied | Applied |
| interviewing | Interviewing |
| offer | Offer |
| accepted | Accepted |
| rejected | Rejected |
| withdrawn | Withdrawn |
| closed | Closed (job posting taken down) |

## History conventions

The History column always shows exactly one event — the most recent one. Format: `YYYY-MM-DD: <text>`.

Common events:

- `YYYY-MM-DD: logged` (initial state)
- `YYYY-MM-DD: applied (Easy Apply)` / `applied (referral via Jane Doe)`
- `YYYY-MM-DD: recruiter screen YYYY-MM-DD`
- `YYYY-MM-DD: tech interview round 2`
- `YYYY-MM-DD: rejected (auto-rejection email)`
- `YYYY-MM-DD: checked, no change`

The History column is **overwritten** on every event, not appended. Past events are not retained in jobs.md. This keeps the file scannable. If long-form audit history is later requested, add it as a separate file — do not bloat the table.

## Parse rules

1. Sections are detected by exact heading match (`## Active (not yet applied)`, etc.).
2. Within each section, jobs are detected by markdown table rows (skip the header and separator rows).
3. The dedup key is the LinkedIn job ID extracted from the Title cell's URL via regex `/jobs/view/(\d+)/`.
4. Rows that don't parse → preserve verbatim, do not delete. Show the user a warning.
5. Empty sections (heading present, no table) are valid.

## Full sample file

```markdown
# Job Hunt Tracker

- **Folder:** C:\Users\<you>\jobs
- **Last search:** 2026-05-07 14:32
- **Last followup:** 2026-05-07 09:00

---

## Active (not yet applied)

| Title | Company | Location | Logged | Updated | Why match | History |
|---|---|---|---|---|---|---|
| [Senior UX/UI Engineer (Agentic AI)](https://www.linkedin.com/jobs/view/4000000002/) | SampleTech | Munich (remote) | 2026-05-07 | — | Agentic AI frontend — leverages Interest in agent workflows + Strength in Angular. | 2026-05-07: logged |

## Applied

| Title | Company | Location | Logged | Updated | Why match | History |
|---|---|---|---|---|---|---|
| [Senior Fullstack Software Engineer – AI Copilot](https://www.linkedin.com/jobs/view/4000000001/) | ExampleCorp | Portugal (remote) | 2026-05-05 | 2026-05-06 | Full-stack + AI copilot — direct hit on Interest in AI-driven apps. | 2026-05-06: applied (Easy Apply) |

## Interviewing

## Offer

## Accepted

## Rejected

## Withdrawn

## Closed (job posting taken down)
```
