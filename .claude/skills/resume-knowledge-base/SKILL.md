---
name: resume-knowledge-base
description: Maintain the canonical Master Resume (career knowledge base). Use when adding or updating career data — a new job, mission, project or achievement — or when another resume skill needs verified source facts. Captures full Level-3 detail before any resume variant is written.
version: 1.0
---

# Resume Knowledge Base

Canonical career data lives here. Every other resume skill (resume-writer, resume-tailor, resume-review) reads from this base and must never contain facts that are absent from it.

## Truth rules (absolute)

- Never invent experience.
- Never invent metrics.
- Never exaggerate responsibilities.
- Only improve clarity, organization and impact.

## Where the data lives in this repo

- `cv-source/main.yaml` — source of truth for the base CV. The `long` variant (`in: [long]` / `in: [short, long]`) is the closest thing to the Master Resume in the pipeline.
- `cv-source/cv.template.yaml` — schema and conventions for all CV YAML files.
- `assets/*.pdf` — generated output, published by the site. Never edit directly.
- `~/Desktop/projects/<name>` — source repositories for personal/freelance projects. **Facts must be extracted from there, never from memory.**

## Fact extraction procedure (before writing any entry)

1. Read the project repo: README, CLAUDE.md, package manifests, deploy configs, docs.
2. Dates: `git log --format=%ad --date=short` (first → last commit). The user's stated dates win over git if they conflict — ask or note the discrepancy.
3. Quantifiables: count tests (spec files, test names), migrations, packages, LOC, users, cost docs. Only numbers actually found in the repo or provided by the user may appear in a resume.
4. Stack: read lockfiles/manifests for exact versions and frameworks.

## Level 3 — Master documentation per experience

Each experience should ultimately be documented with:

- Business context (what the product is, who uses it)
- Responsibilities and role (solo? team size? direct client?)
- Architecture and technical decisions
- Technical challenges
- Achievements (with verified metrics)
- Leadership
- Metrics
- Lessons learned
- Technologies (exact versions)

Level 1 (one sentence) and Level 2 (3–6 recruiter bullets) are *derived* from Level 3 by resume-writer — never written first.

## Maintenance rules

- New mission or project → document Level 3 facts here (in `main.yaml` long bullets and/or a notes file) before producing any short/tailored variant.
- Update, don't duplicate: one canonical entry per experience.
- Record absolute dates ("May 2026"), never relative ones ("last month").
- EN and FR strings are maintained in parallel in the YAML — a fact added in one language must be added in both.
