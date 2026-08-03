# Driss Najih — Portfolio

A dark, orbital, single-page portfolio for a senior software engineer focused on
AI-driven applications. The whole page sits behind a live **WebGL cosmos** — a
Three.js GLSL shader that blends a flowing, domain-warped nebula with a
twinkling glitter overlay, fading into deep space as you scroll.

> Recreated from a [Claude Design](https://claude.ai/design) handoff
> (`Portfolio WebGL`) as a clean, zero-build static site.

- **Repository:** [github.com/kouji-dev/portfolio](https://github.com/kouji-dev/portfolio)
- **Live:** _add your Vercel URL / custom domain here_

## Stack

- **Plain static site** — no framework, no build step. The deployed site has zero
  dependencies; the CV generator under `cv-source/` is authoring-time only and is
  excluded from the deploy.
- **[Three.js](https://threejs.org/) 0.160.0** (jsDelivr CDN) for the GLSL cosmos backdrop.
- **Fonts** (Google Fonts): Space Grotesk (display), Sora (body), JetBrains Mono (mono).

## Project layout

| Path           | Purpose                                                           |
|----------------|-------------------------------------------------------------------|
| `index.html`   | All markup and content (nav, hero, about, work, experience, contact). |
| `styles.css`   | Stellar palette tokens, layout, responsive grids, hover states.   |
| `cosmos.js`    | WebGL shader backdrop + scroll-reveal (`IntersectionObserver`).   |
| `favicon.svg`  | Orbital mark.                                                     |
| `vercel.json`  | Clean URLs + cache/security headers.                              |
| `assets/`      | Generated CV PDFs, served and linked from the page. **Never edit by hand.** |
| `cv-source/`   | CV pipeline: YAML sources + generator that writes into `assets/`. |
| `.vercelignore`| Keeps authoring tooling (`cv-source/`, `.claude/`, `kouji/`) out of the deploy. |

## Sections

- **Hero** — animated cosmos, shimmering gradient headline, quick links.
- **About** — positioning, key stats, and a six-cell skills grid.
- **Featured Work** — Orrery and Kouji UI as *live, interactive* iframe embeds in browser frames.
- **Also building** — AI Portal, Pages, GamerGG, Chartify → GitHub.
- **Experience** — seven-year timeline (Amundi → Scor).
- **Contact** — email, LinkedIn, GitHub.

## Accessibility & performance

- Honors `prefers-reduced-motion`: the cosmos renders a single still frame and
  the reveal/shimmer animations are disabled.
- The render loop pauses while the tab is hidden (`visibilitychange`).
- A CSS gradient is painted underneath as a fallback while Three.js loads from
  the CDN, or if WebGL is unavailable.

## Run locally

It's a static site. The simplest way is to just open the file:

- **Double-click `index.html`** (paths are relative, so it works from `file://`).

Or serve the folder for a closer-to-production setup:

```bash
npx serve .
# or
python -m http.server 8000   # then open http://localhost:8000
```

> Three.js and the Google Fonts load from CDNs, so the animated background and
> exact typography need an internet connection on first load.

## Deploy to Vercel

Zero config — no build, no install. `vercel.json` applies clean URLs and
cache/security headers automatically.

### Option A — Git import (recommended)

1. Open **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. **Import** `kouji-dev/portfolio` (grant repo access if prompted).
3. Keep every field at its default:
   - **Framework Preset:** `Other`
   - **Build Command / Output Directory / Install Command:** _leave empty_ (served from the repo root)
4. **Deploy.**

Every push to `main` then redeploys automatically, and pull requests get preview URLs.

### Option B — CLI

```bash
npx vercel        # first run links the project and deploys a preview
npx vercel --prod # promote to production
```

### Custom domain

In **Settings → Domains**, add a domain (e.g. `kouji.dev` / `www.kouji.dev`, or a
subdomain), then add the DNS record Vercel shows at your registrar. TLS is automatic.

## CV pipeline

The downloadable CVs are **generated**, not hand-maintained. `cv-source/main.yaml`
is the single source of truth; the generator renders it to HTML and prints to PDF
via Puppeteer, writing straight into `assets/` with the exact filenames
`index.html` links to — there is no rename step.

```bash
cd cv-source
npm install                  # first run only (downloads Chromium)
npm run convert              # 4 PDFs: en/fr x short/long -> ../assets
```

| Flag | Effect |
|------|--------|
| `--lang=en` / `--version=short` | Build a subset instead of all four. |
| `--source=frontend.yaml --tag=frontend` | Build a tailored variant → `najih-driss-cv-frontend-en-short.pdf`. |
| `--out=./build` | Write somewhere other than `../assets`. |
| `--docx` | Also emit DOCX alongside each PDF. |

Every string in the YAML is an **EN + FR pair**, and `in: [short, long]` tags
control which variant an entry appears in. Short variants must stay **one page** —
verify after each build.

`cv-source/` is committed (so a fresh clone can rebuild) but excluded from the
deploy via `.vercelignore`, so the YAML sources are never served from the domain.
The Claude Code skills in `.claude/skills/` (`resume-writer`, `resume-tailor`,
`resume-review`, `resume-knowledge-base`) drive this pipeline.

## Customizing content

All copy and data live directly in `index.html` (skills, projects, experience,
contact links). Colors and typography are CSS variables under `:root` in
`styles.css`; the cosmos defaults (`heroStyle`, `flowSpeed`, `glitterIntensity`)
are in the `CONFIG` object at the top of `cosmos.js`.
