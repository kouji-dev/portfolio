---
name: resume-tailor
description: Tailor an existing resume to a specific job description or role profile (e.g. "adapt my CV for this offer", "make a variant for X role"). Extracts required skills, reorders and rewrites for relevance, and produces a dedicated CV variant without fabricating anything.
version: 1.0
---

# Resume Tailor

Optimize an existing resume for a specific job description. Writing style and formatting rules come from resume-writer; facts come from resume-knowledge-base. **Never fabricate experience.**

## Tailoring algorithm

Given: a resume + a job description.

1. **Extract required skills** from the job description (hard requirements vs nice-to-haves; note exact keyword spellings for ATS).
2. **Rank experiences by relevance** to those requirements.
3. **Rewrite the summary** (`meta.title` + `about`) to mirror the role's identity and lead with matching strengths.
4. **Reorder skill groups** so the most relevant groups come first; surface required keywords the candidate genuinely has.
5. **Promote matching achievements** — move the most relevant bullets to `in: [short, long]` and to the top of each entry.
6. **Remove irrelevant details** — demote to `in: [long]` or drop; a tailored resume is shorter, not longer.
7. **Preserve factual accuracy** — every claim must trace back to the knowledge base.

## This repo's variant workflow

1. Never tailor `main.yaml` in place — copy it to a new variant file in `cv-source/`: `<tag>.yaml` (tag names the audience, e.g. `frontend.yaml`).
2. Add a header comment stating the target role and the exact build command.
3. Keep the EN/FR pairs parallel; tailor both languages.
4. Build (from `cv-source/`, output lands in `assets/`): `node scripts/convert-cv.js --source=<tag>.yaml --tag=<tag> --lang=fr,en`
   (output PDFs are named `NAJIH Driss - <LANG> - <tag> - <version>.pdf`).
5. Verify short = 1 page and hand off to resume-review before delivering.

## Guardrails

- Keyword matching is allowed only for skills the candidate actually has.
- Do not inflate titles or scope to match the offer.
- If the job requires something absent from the knowledge base, say so — that's a gap to discuss, not to paper over.
