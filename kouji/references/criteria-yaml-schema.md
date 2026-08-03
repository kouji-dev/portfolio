# criteria.yaml schema

Single config file for the job hunt. Lives in the user's chosen folder. Edited by the user; read by every mode of the skill.

## Schema

```yaml
folder: <absolute path>          # required after first run; where this file and jobs.md live
resume_path: <absolute path>     # optional; used by search to write the "why match" line

max_jobs_per_run: <int>          # optional; hard cap on the number of NEW jobs appended to jobs.md per search run. Jobs already logged in jobs.md do NOT count toward this cap. When the cap is reached, search stops running further queries (saves browser time). Default: unlimited.

searches:                        # required; cartesian product of keywords × locations
  keywords: [<string>, ...]      # required; non-empty list of LinkedIn keyword queries
  locations: [<string>, ...]     # required; non-empty list of LinkedIn location labels (e.g. "European Union", "United States", "France")
                                 # Total queries run = len(keywords) × len(locations)

exclude_titles: [<string>, ...]               # optional; case-insensitive substring match on title
exclude_keywords_in_title: [<string>, ...]    # optional; same as above (kept separate for clarity)
exclude_companies: [<string>, ...]            # optional; case-insensitive exact match on company

exclude_domains: [<string>, ...]              # optional; industry/sector names ONLY. The skill expands each name into companies/sub-keywords at filter time using general knowledge — do NOT enumerate companies in the YAML. See the "Domain exclusion" section below for how the expansion works.

defaults:                        # optional; applied to every search in the cartesian product
  remote: true                   # → f_WT=2
  posted_within_days: 7          # → f_TPR=r<seconds>
  contract_types:                # → f_JT
    - full_time                  # → F (CDI / permanent / salaried)
    - contract                   # → C (freelance / contractor / mission)
    - part_time                  # → P
    - temporary                  # → T
    - internship                 # → I (don't list unless you want internships)
  experience_levels:             # → f_E
    - mid                        # → 2
    - senior                     # → 3
    - director                   # → 4
  salary_min_k: <int>            # min salary in thousands; mapped to closest LinkedIn USD bucket via f_SB2 (1=40, 2=60, 3=80, 4=100, 5=120, 6=140, 7=160, 8=180, 9=200, 10=220). LinkedIn buckets are USD-anchored — approximate for EUR/GBP. A client-side hard filter also drops jobs that publish a salary below this floor.
```

## Contract type mapping (LinkedIn `f_JT`)

| YAML value | LinkedIn code | Notes |
|---|---|---|
| `full_time` | F | CDI in France, permanent / salaried elsewhere |
| `contract` | C | Freelance, contractor, mission, daily-rate |
| `part_time` | P | |
| `temporary` | T | Fixed-term contract (CDD in France) |
| `internship` | I | Excluded by default unless explicitly listed |
| `volunteer` | V | Rare |
| `other` | O | |

When multiple values are set, LinkedIn ANDs them (it returns jobs matching ANY of the codes). Pass them comma-separated: `f_JT=F,C`.

## Salary mapping (LinkedIn `f_SB2`)

| `salary_min_k` | LinkedIn bucket | Filter |
|---|---|---|
| ≤ 40 | 1 | $40K+ |
| 41–60 | 2 | $60K+ |
| 61–80 | 2 | $60K+ (undershoot for 61–69 is intentional — better to see slightly lower-paid jobs and filter than miss EUR-priced ones) |
| 81–100 | 3 | $80K+ |
| 101–120 | 4 | $100K+ |
| 121–140 | 5 | $120K+ |
| 141–160 | 6 | $140K+ |
| 161–180 | 7 | $160K+ |
| 181–200 | 8 | $180K+ |
| 201–220 | 9 | $200K+ |
| > 220 | 10 | $220K+ |

**Client-side hard filter:** after extraction, parse any salary text on the job card. If a max salary is listed and is below `salary_min_k`, drop the job. If no salary is listed, keep it — most jobs don't publish salary, and excluding all of them would shrink results to near-zero.

## Domain exclusion

LinkedIn doesn't expose an industry-exclude URL parameter. The user lists **only the domain name** (e.g. `defense`, `gambling`) — never companies, never sub-keywords. The skill expands each name into the actual filter at search time using general knowledge of which companies and product categories belong to that domain.

**How the expansion works at filter time:**

For each job extracted from LinkedIn, build a haystack from `title + " " + company` (lowercase). Then, for each entry in `exclude_domains`, judge whether the job belongs to that domain. Use general knowledge — you know that "Diageo" is alcohol, "DraftKings" is gambling, "Lockheed Martin" is defense, "Palantir" is defense-adjacent, "Heineken" is alcohol, etc. You also know that words like "casino", "brewery", "munitions", "payday loan" signal those domains.

**Rules of thumb to keep precision high:**

- Match company name first — it's the most reliable signal.
- Then the title — a title containing "betting platform" is gambling regardless of company.
- Don't match speculative substrings — "Defender" in a product name isn't defense; "Spirits" in a band name isn't alcohol. Use judgment, not blind substring matching.
- When uncertain, **keep the job** and add a flag in the history line (`flagged: possibly defense — review`). False-negatives are recoverable; false-positives delete data the user wanted to see.

**Always log every exclusion** in the search summary so the user can review and re-add false-positives. Format: `Excluded [Job Title] @ [Company] — domain: [domain]`. Print these as a collapsible block at the end of the summary, not inline with the new-jobs list.

**Domain vocabulary the skill recognizes by default:** `alcohol`, `gambling`, `usury`, `defense`, `tobacco`, `adult`, `crypto`, `mlm`. The user can list any other domain — the skill will do its best to recognize companies/keywords for it. If the skill genuinely doesn't recognize a domain (e.g. niche industry), warn the user that filtering will be best-effort or zero-effort, not silent.

## Example (Senior full-stack + AI focus, EU + US remote)

```yaml
folder: C:\Users\<you>\jobs
resume_path: C:\Users\<you>\resume.md

max_jobs_per_run: 10

defaults:
  remote: true
  posted_within_days: 7
  contract_types: [full_time, contract]
  salary_min_k: 70

searches:
  keywords:
    - Senior Full Stack Angular Java AI
    - Senior Full Stack TypeScript AI
    - Senior Java Spring Boot AI
    - Senior Full Stack Engineer AI
  locations:
    - European Union
    - United States

exclude_titles: [intern, junior, apprentice, stagiaire, alternance]
exclude_keywords_in_title: [QA, SDET, Manual Tester]

exclude_domains:
  - alcohol
  - gambling
  - usury
  - defense
```

This runs 4 × 2 = 8 LinkedIn queries.

## Validation rules

When loading `criteria.yaml`:

1. `folder` must be an absolute path that exists. If missing on first run, fall back to setup.
2. `searches` must be a non-empty list. Empty list = config error; abort with a clear message.
3. Each `searches[].keywords` and `searches[].location` must be non-empty strings. Anything else is a config error.
4. Unknown top-level keys → warn the user but don't abort (they may have added comments / experimental fields).
5. Every `exclude_*` filter is matched case-insensitively.
6. `salary_min_k` must be a positive integer if set. Map to the closest LinkedIn bucket per the table above.
7. `contract_types` values must be from the allowed set above. Unknown values are warned but ignored (don't break the search).
