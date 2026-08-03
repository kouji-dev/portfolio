---
name: resume-review
description: Score and critique a resume before delivery — checklist verification, ATS compatibility, factual cross-check against the knowledge base, page-count and EN/FR parity checks for this repo's CV pipeline. Use as the final quality gate after writing or tailoring a resume.
version: 1.0
---

# Resume Review

Final quality gate. Run after resume-writer or resume-tailor, before delivering PDFs to the user.

## Checklist (verify every item)

- ✓ Professional summary is concise (≤100 words) and answers who/experience/stack/strengths.
- ✓ Skills are grouped logically — no keyword dumps.
- ✓ Experience is ordered by relevance (reverse-chronological unless tailored).
- ✓ Every bullet starts with a strong action verb (no "Worked on", "Responsible for", "Helped").
- ✓ Every bullet communicates impact (XYZ or Action+Tech+Outcome; never STAR).
- ✓ **Every mission uses the four-part structure** — Context → Responsibilities → Key Achievements → Technical Environment. No extra sections, no `challenges:` on new entries.
- ✓ **Density budget respected**: ≤12 bullets per mission (6–8 responsibilities, 3–5 achievements), 2–3 per project. Older entries proportionally smaller.
- ✓ **No bullet over ~200 characters** — measure, don't eyeball. Flag nested parentheticals, enumerated internals and exhaustive lists inside a single bullet.
- ✓ **Sub-groups only for genuinely distinct teams/clients/products** — never as a way to split one mission by feature area.
- ✓ No duplicated technologies across bullets/tech lines within an entry; each `tech:` line reflects that mission only, not the global stack.
- ✓ ATS compatibility: standard headings, single column, no tables/icons/graphics.
- ✓ Consistent tense and consistent date formats.
- ✓ Appropriate length per type (long/dossier 2–3 pages, 5 absolute max; Executive/short = exactly 1 page).
- ✓ **No fabricated information** — spot-check every metric and claim against resume-knowledge-base / source repos.

## Repo-specific checks

- Short PDFs are **exactly 1 page** and long PDFs within **2–3 pages**: rebuild and count pages (`/Type /Pages … /Count N` in the PDF binary), for every language of every source file. An over-budget long is a **fail**, not a note — report which entries carry the excess bullets.
- **EN/FR parity**: each edited `en:` string has a semantically equivalent `fr:` sibling and vice versa.
- YAML loader warnings reviewed: only the intentional `[short]`-not-in-`[long]` summary-bullet warning is acceptable.
- PDFs regenerated from the current YAML (never hand-edited).

## Scoring rubric (report when asked for a review)

Score 1–10 per dimension, with one-line justification and the single highest-impact fix for each dimension below 8:

1. First-20-seconds clarity (identity + value obvious?)
2. Achievement quality (verbs, metrics, impact)
3. Relevance/ordering for the target audience
4. Skimmability (bullet length, density, structure)
5. ATS robustness
6. Truthfulness/verifiability

## Output

Return: pass/fail per checklist item, scores, and a ranked list of concrete fixes. Apply fixes only when the user asked for fixes, not just a review.
