# context.md schema

Persistent candidate profile distilled from the resume. Lives at `<folder>/context.md`. The skill reads this on every search to write better "why match" lines and to rank competing jobs when the cap kicks in.

## Why this file exists

The resume is the *source*. context.md is the *interpretation* — the soft signals the skill needs to match jobs well, in a form that:

- Stays compact (the resume is too long to keep in working memory across many jobs)
- Can be **edited by the user** to shape how the skill perceives them. A user pivoting careers (e.g. away from frontend, toward AI engineering) edits context.md to lean toward the future they want, without touching the resume PDF.
- Captures preferences and anti-preferences that the resume itself would never state explicitly (resumes don't say "I'm tired of legacy migrations" or "I want to work in fintech but not insurance").

context.md is the soft layer. `criteria.yaml` is the hard layer. They are complementary:

- `criteria.yaml` decides which jobs are even *eligible* (hard filters: location, contract, salary, excluded domains).
- `context.md` decides *how compelling* an eligible job is for this candidate (soft scoring: strengths fit, interest fit) and shapes the wording of the per-job "why match" line.

## Schema

```markdown
# Candidate Context

> **Source resume:** <path to resume file>
> **Last regenerated:** YYYY-MM-DD
> **Manually edited:** yes/no    ← if "yes", do not auto-overwrite without confirming

## Strengths (excels at)
- <skill or capability the candidate has demonstrated repeatedly>
- ...

## Interests (likes, wants more of)
- <stack, domain, type of problem the candidate is drawn to>
- ...

## Experience domains
- <industry / business domain the candidate has shipped in>
- ...

## Anti-preferences (soft excludes — avoid unless rare gem)
- <type of work the candidate would prefer not to do>
- ...

## Free-form notes
<Any other signal that helps shape job matching — career trajectory the candidate is aiming at, learning goals, personal projects that hint at interests, etc.>
```

## Field semantics

| Field | What it captures | How the skill uses it |
|---|---|---|
| Strengths | Concrete capabilities backed by experience (e.g. "framework / platform-level architecture", "low-code / config-driven UI design") | Lead the "why match" line with the strongest overlap; rank jobs higher when their description aligns with multiple strengths |
| Interests | Direction the candidate is leaning, even if not deeply experienced yet (e.g. "agentic AI", "developer-tooling startups") | Boost ranking for jobs that hit interests, even if not strengths — these are the "stretch" matches the user genuinely wants |
| Experience domains | Business domains shipped in (e.g. "asset management / fintech", "insurance risk modeling", "internal developer platforms") | Used to phrase domain-specific "why match" lines and to spot transferable-domain matches |
| Anti-preferences | Soft no-gos that aren't strict enough for `criteria.yaml` excludes | A job hitting an anti-preference is dropped only if there's no offsetting strength/interest hit. If logged, mention the trade-off in "why match". |
| Free-form notes | Anything that doesn't fit above — career trajectory, side-project signals, geographic constraints | Read for context when writing "why match" or when uncertain about a borderline job |

## How the skill generates context.md

Triggered by:
- Setup (first run, when context.md doesn't exist)
- Explicit user request: "rebuild my context", "regenerate context", "context from resume"
- When the resume file's mtime is newer than context.md's mtime (warn the user, don't auto-overwrite)

Steps:

1. Read the resume file at `criteria.yaml#resume_path`.
2. Extract — using judgment, not mechanical rules — the most predictive signals for job matching:
   - **Strengths**: capabilities that recur across multiple roles, or that the candidate emphasized in their summary. A skill listed in the technical-skills table without role context is weaker signal than a capability described in a job's responsibilities.
   - **Interests**: things the candidate explicitly says they want, side projects (which signal what they choose to spend free time on), and stated career direction in the summary.
   - **Experience domains**: business contexts of past roles, not the tech stack. ("Asset management" not "Java".)
   - **Anti-preferences**: usually NOT in the resume — leave empty initially unless something jumps out (e.g. resume avoids mentioning a previous role / domain). Mostly populated by the user via manual edit.
3. Write context.md with `Manually edited: no` in the header.
4. Show the user the generated file and explicitly invite them to edit. Mention that the file is theirs to shape — the skill won't auto-regenerate once they flip `Manually edited: yes`.

## Manual edits override regeneration

If `Manually edited: yes` in the header, the skill MUST NOT auto-overwrite the file. If the user explicitly asks to rebuild, ask first: "Your context.md is marked as manually edited. Regenerating will lose your edits unless you've copied them. Continue?"

## How search uses context.md

For each candidate job that survives hard filters:

1. **Why-match line**: write a one-sentence framing that explicitly references the strongest match between the job and `Strengths` or `Interests` from context.md. Avoid generic lines like "stack matches" — name the strength.
2. **Ranking when cap applies**: if more candidates are eligible than `max_jobs_per_run` allows, rank by:
   - +2 per Strengths hit
   - +1 per Interests hit
   - +1 per Experience-domains hit
   - −1 per Anti-preferences hit (drops to bottom; only included if no other candidates available)
   - Tiebreaker: more recent posting first
3. **Borderline judgment**: when uncertain whether a job fits, read the Free-form notes for orientation.

If context.md doesn't exist, fall back to using the raw resume — but warn the user once that they'd get better matches by generating a context.md.